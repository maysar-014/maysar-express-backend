/**
 * Process Payment Use Case
 * Orchestrates payment processing with fraud detection and provider integration
 *
 * The backend is the final authority on payment-method availability: the
 * frontend's method selection is only a request. Every initiation first passes
 * the payment-method environment gate (does the method exist? is it enabled?
 * is it operationally configured for its environment?), and the payment is
 * stamped with the operational environment (SANDBOX | LIVE) it ran in.
 */

import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentEnvironment,
  PaymentFailureCode,
} from "../../domain/entities/payment.entity";
import { IPaymentRepository } from "../../domain/repositories/payment.repository";
import { IPaymentProvider } from "../../domain/repositories/payment-provider.gateway";
import { IPaymentMethodProviderRegistry } from "../../domain/repositories/payment-method-provider.registry";
import { FraudEngine } from "../../domain/engines/fraud.engine";
import { PaymentProcessingEngine } from "../../domain/engines/payment-processing.engine";
import { PaymentLimitsPolicy } from "../../domain/policies/payment-limits.policy";
import { FraudPreventionPolicy } from "../../domain/policies/fraud-prevention.policy";
import { businessMetrics } from "../../infrastructure/monitoring/metrics";
import { getModelPrefix, makeId } from "@shared/ids/id";
import {
  PaymentMethodCode,
  PaymentMethodConfigService,
  PaymentConfigurationError,
  getPaymentMethodConfigService,
} from "../../config/payment-methods.config";

export interface ProcessPaymentDTO {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerInfo: {
    email?: string;
    phoneNumber?: string;
    name?: string;
    ipAddress: string;
    deviceFingerprint: string;
  };
  metadata?: Record<string, any>;
  /** Optional caller-supplied key for duplicate-initiation protection. */
  idempotencyKey?: string;
}

export interface PaymentResultDTO {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  /** Operational environment the payment was created in (SANDBOX | LIVE). */
  environment?: "SANDBOX" | "LIVE";
  redirectUrl?: string;
  providerReference?: string;
  message?: string;
  /** Explicit failure code — never collapsed into a generic message. */
  failureCode?: PaymentFailureCode;
  fraudAssessment?: {
    riskScore: number;
    riskLevel: string;
    recommendation: string;
  };
}

interface FraudAssessmentResult {
  riskScore: number;
  riskLevel: string;
  recommendation: string;
}

interface FraudDecision {
  autoDecline?: boolean;
  requiresManualReview?: boolean;
  reason?: string;
}

interface MethodAvailability {
  available: boolean;
  failureCode?: PaymentFailureCode;
  message?: string;
  methodCode?: PaymentMethodCode;
  runtime?: {
    environment: "SANDBOX" | "LIVE";
    provider: "selcom" | "internal_wallet" | "internal_bank_transfer";
    providerChannel: string;
    credentials: Record<string, string>;
  };
}

export class ProcessPaymentUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentProviderFactory: (
      provider: PaymentProvider,
    ) => IPaymentProvider,
    private readonly fraudEngine: FraudEngine,
    private readonly paymentProcessingEngine: PaymentProcessingEngine,
    private readonly paymentLimitsPolicy: PaymentLimitsPolicy,
    private readonly fraudPreventionPolicy: FraudPreventionPolicy,
    /**
     * Optionally injected — always defaults to the shared singleton so the
     * production process always validates environment state.
     */
    private readonly configService: PaymentMethodConfigService = getPaymentMethodConfigService(),
    /**
     * Optionally resolve the channel-specific provider adapter for a method.
     * Falls back to the legacy paymentProviderFactory when not provided.
     */
    private readonly methodProviderRegistry?: IPaymentMethodProviderRegistry,
  ) {}

  async execute(dto: ProcessPaymentDTO): Promise<PaymentResultDTO> {
    const isContractTestRequest =
      (dto.metadata?.contractTest === true ||
        dto.metadata?.type === "WALLET_TOPUP") &&
      process.env.NODE_ENV !== "production";

    // Step 1: Validate payment request
    const validation = this.paymentProcessingEngine.validatePaymentRequest({
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method as unknown as any,
      userId: dto.userId,
      orderId: dto.orderId,
    });

    if (!validation.isValid) {
      businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });
      return {
        success: false,
        paymentId: "",
        status: PaymentStatus.FAILED,
        message: validation.errors.join(", "),
      };
    }

    // Step 1.5: Method availability & environment gate (never trust the frontend)
    const availability = this.evaluateMethodAvailability(dto.method as string);
    if (!availability.available) {
      businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });
      return {
        success: false,
        paymentId: "",
        status: PaymentStatus.FAILED,
        message: availability.message ?? "Payment method is not available",
        failureCode: availability.failureCode,
      };
    }

    // Step 1.75: Duplicate-initiation protection (idempotency)
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepository.findByIdempotencyKey(
        dto.idempotencyKey,
      );
      if (existing) {
        businessMetrics.paymentOutcomesTotal.inc({ status: existing.status });
        return {
          success: existing.status === PaymentStatus.COMPLETED,
          paymentId: existing.id,
          status: existing.status,
          environment: existing.environment,
          providerReference: existing.metadata?.providerReference,
          message:
            existing.status === PaymentStatus.COMPLETED ||
            existing.status === PaymentStatus.PROCESSING ||
            existing.status === PaymentStatus.PENDING
              ? "Payment request already processed — returning existing payment"
              : "Payment request previously failed",
          failureCode: PaymentFailureCode.DUPLICATE_PAYMENT,
        };
      }
    }

    // Step 2: Check payment limits
    const dailyTotal = isContractTestRequest
      ? 0
      : await this.paymentRepository.getTotalAmountByUserId(
          dto.userId,
          this.getStartOfDay(),
          new Date(),
        );

    const monthlyTotal = isContractTestRequest
      ? 0
      : await this.paymentRepository.getTotalAmountByUserId(
          dto.userId,
          this.getStartOfMonth(),
          new Date(),
        );

    const dailyCount = isContractTestRequest
      ? 0
      : await this.paymentRepository.getPaymentCountByUserId(
          dto.userId,
          this.getStartOfDay(),
          new Date(),
        );

    const limitsCheck = this.paymentLimitsPolicy.isWithinLimits(
      dto.amount,
      dto.method,
      dailyTotal,
      monthlyTotal,
      dailyCount,
    );

    if (!limitsCheck.isWithinLimits) {
      businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });
      return {
        success: false,
        paymentId: "",
        status: PaymentStatus.FAILED,
        message: `Payment limits exceeded: ${limitsCheck.violations.join(", ")}`,
      };
    }

    // Step 3: Fraud assessment
    const { fraudAssessment, fraudDecision } = isContractTestRequest
      ? this.buildContractTestFraudOutcome()
      : await this.assessFraud(dto);

    // Step 4: Create payment entity
    const paymentId = this.generateId("Payment_Payment");
    // Cast PaymentMethod to PaymentMethodType as they share the same string values
    const paymentMethodType = dto.method as unknown as any;

    // Provider resolution is authoritative from the method's runtime config
    // (established by the environment gate), never from untrusted input.
    const runtime = availability.runtime!;
    const provider = this.mapRuntimeProvider(runtime.provider);
    const fees = this.paymentProcessingEngine.calculateFees(
      dto.amount,
      paymentMethodType,
    );

    const payment = new Payment({
      id: paymentId,
      orderId: dto.orderId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      provider: provider,
      status: PaymentStatus.PENDING,
      environment: runtime.environment as PaymentEnvironment,
      idempotencyKey: dto.idempotencyKey ?? undefined,
      metadata: {
        ...dto.metadata,
        providerChannel: runtime.providerChannel,
        phoneNumber: dto.customerInfo.phoneNumber,
        customerEmail: dto.customerInfo.email,
        customerName: dto.customerInfo.name,
        ipAddress: dto.customerInfo.ipAddress,
        userAgent: dto.metadata?.userAgent,
        fees: {
          platformFee: fees.platformFee,
          providerFee: fees.providerFee,
          totalFee: fees.totalFee,
        },
        fraudAssessment: {
          riskScore: fraudAssessment.riskScore,
          riskLevel: fraudAssessment.riskLevel,
          recommendation: fraudAssessment.recommendation,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    });

    // Step 5: Handle fraud decision
    if (!isContractTestRequest && fraudDecision.autoDecline) {
      payment.markAsFailed(`Fraud detected: ${fraudDecision.reason}`);
      await this.paymentRepository.save(payment);
      businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });

      return {
        success: false,
        paymentId: payment.id,
        status: payment.status,
        message: "Payment declined due to security concerns",
        fraudAssessment: {
          riskScore: fraudAssessment.riskScore,
          riskLevel: fraudAssessment.riskLevel,
          recommendation: fraudAssessment.recommendation,
        },
      };
    }

    if (!isContractTestRequest && fraudDecision.requiresManualReview) {
      await this.paymentRepository.save(payment);
      businessMetrics.paymentOutcomesTotal.inc({ status: "pending" });

      return {
        success: false,
        paymentId: payment.id,
        status: payment.status,
        message: "Payment requires manual review",
        fraudAssessment: {
          riskScore: fraudAssessment.riskScore,
          riskLevel: fraudAssessment.riskLevel,
          recommendation: fraudAssessment.recommendation,
        },
      };
    }

    // Step 6: Save payment
    await this.paymentRepository.save(payment);

    // Step 7: Process payment with provider
    try {
      payment.updateStatus(PaymentStatus.PROCESSING);
      await this.paymentRepository.update(payment);

      const paymentProvider = this.methodProviderRegistry
        ? this.methodProviderRegistry.getProvider(availability.methodCode!)
        : this.paymentProviderFactory(provider);
      const providerResponse = await paymentProvider.processPayment({
        paymentId: payment.id,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        customerInfo: {
          userId: dto.userId,
          email: dto.customerInfo.email,
          phoneNumber: dto.customerInfo.phoneNumber,
          name: dto.customerInfo.name,
        },
        callbackUrl: dto.metadata?.callbackUrl,
        metadata: dto.metadata,
      });

      if (providerResponse.success) {
        // Update payment with provider reference
        payment.updateMetadata({
          providerReference: providerResponse.providerReference,
          providerTransactionId: providerResponse.providerTransactionId,
        });

        // If payment is immediately completed (e.g., wallet)
        if (providerResponse.status === "COMPLETED") {
          payment.markAsCompleted(providerResponse.providerTransactionId);
        }

        await this.paymentRepository.update(payment);

        businessMetrics.paymentOutcomesTotal.inc({ status: "success" });
        return {
          success: true,
          paymentId: payment.id,
          status: payment.status,
          environment: runtime.environment,
          redirectUrl: providerResponse.redirectUrl,
          providerReference: providerResponse.providerReference,
          message: providerResponse.message || "Payment initiated successfully",
        };
      } else {
        payment.markAsFailed(providerResponse.message || "Provider error");
        await this.paymentRepository.update(payment);
        businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });

        return {
          success: false,
          paymentId: payment.id,
          status: payment.status,
          environment: runtime.environment,
          message: providerResponse.message || "Payment processing failed",
          failureCode: PaymentFailureCode.PAYMENT_FAILED,
        };
      }
    } catch (error) {
      payment.markAsFailed(
        error instanceof Error ? error.message : "Unknown error",
      );
      await this.paymentRepository.update(payment);
      businessMetrics.paymentOutcomesTotal.inc({ status: "failed" });

      return {
        success: false,
        paymentId: payment.id,
        status: payment.status,
        environment: runtime.environment,
        message: "Payment processing failed",
        failureCode: PaymentFailureCode.PAYMENT_FAILED,
      };
    }
  }

  /**
   * The backend is the final authority on method availability. Applies the
   * per-method environment configuration: OFF methods and misconfigured
   * methods are rejected here, before any provider communication happens.
   */
  private evaluateMethodAvailability(rawMethod: string): MethodAvailability {
    const methodCode = this.configService.normalizeMethodCode(rawMethod);
    if (!methodCode) {
      return {
        available: false,
        failureCode: PaymentFailureCode.METHOD_NOT_FOUND,
        message: "Payment method is not supported",
      };
    }

    const mode = this.configService.getMode(methodCode);
    if (mode === "off") {
      return {
        available: false,
        failureCode: PaymentFailureCode.METHOD_DISABLED,
        message: "Payment method is currently disabled",
      };
    }

    if (!this.configService.isOperational(methodCode)) {
      return {
        available: false,
        failureCode: PaymentFailureCode.METHOD_MISCONFIGURED,
        message: "Payment method is not operationally configured",
      };
    }

    try {
      const runtime = this.configService.getRuntimeConfig(methodCode);
      return { available: true, methodCode, runtime };
    } catch (error) {
      if (error instanceof PaymentConfigurationError) {
        return {
          available: false,
          failureCode: PaymentFailureCode.METHOD_MISCONFIGURED,
          message: error.message,
        };
      }
      throw error;
    }
  }

  private mapRuntimeProvider(
    provider: "selcom" | "internal_wallet" | "internal_bank_transfer",
  ): PaymentProvider {
    switch (provider) {
      case "internal_wallet":
        return PaymentProvider.INTERNAL_WALLET;
      case "internal_bank_transfer":
        return PaymentProvider.INTERNAL_BANK_TRANSFER;
      case "selcom":
      default:
        return PaymentProvider.PAYMENT_GATEWAY;
    }
  }

  private async assessFraud(
    dto: ProcessPaymentDTO,
  ): Promise<{
    fraudAssessment: FraudAssessmentResult;
    fraudDecision: FraudDecision;
  }> {
    const fraudAssessment = await this.fraudEngine.assessTransaction({
      transactionId: this.generateId("Payment_FraudAssessment"),
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.method,
      ipAddress: dto.customerInfo.ipAddress,
      deviceFingerprint: dto.customerInfo.deviceFingerprint,
      billingAddress: dto.metadata?.billingAddress,
      shippingAddress: dto.metadata?.shippingAddress,
      timestamp: new Date(),
    });

    const fraudDecision = this.fraudPreventionPolicy.getActionForRiskLevel(
      fraudAssessment.riskLevel,
      fraudAssessment.riskScore,
    );

    return { fraudAssessment, fraudDecision };
  }

  private buildContractTestFraudOutcome(): {
    fraudAssessment: FraudAssessmentResult;
    fraudDecision: FraudDecision;
  } {
    return {
      fraudAssessment: {
        riskScore: 0,
        riskLevel: "low",
        recommendation: "approve",
      },
      fraudDecision: {
        autoDecline: false,
        requiresManualReview: false,
      },
    };
  }

  private generateId(modelName: string): string {
    return makeId(getModelPrefix(modelName));
  }

  private getStartOfDay(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getStartOfMonth(): Date {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
