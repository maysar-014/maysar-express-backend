/**
 * Process Payment Use Case
 * Orchestrates payment processing with fraud detection and provider integration
 */

import { Payment, PaymentStatus, PaymentMethod, PaymentProvider } from '../../domain/entities/payment.entity';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';
import { IPaymentProvider } from '../../domain/repositories/payment-provider.gateway';
import { FraudEngine } from '../../domain/engines/fraud.engine';
import { PaymentProcessingEngine } from '../../domain/engines/payment-processing.engine';
import { PaymentLimitsPolicy } from '../../domain/policies/payment-limits.policy';
import { FraudPreventionPolicy } from '../../domain/policies/fraud-prevention.policy';
import { businessMetrics } from '../../infrastructure/monitoring/metrics';

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
}

export interface PaymentResultDTO {
    success: boolean;
    paymentId: string;
    status: PaymentStatus;
    redirectUrl?: string;
    providerReference?: string;
    message?: string;
    fraudAssessment?: {
        riskScore: number;
        riskLevel: string;
        recommendation: string;
    };
}

export class ProcessPaymentUseCase {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        private readonly paymentProviderFactory: (provider: PaymentProvider) => IPaymentProvider,
        private readonly fraudEngine: FraudEngine,
        private readonly paymentProcessingEngine: PaymentProcessingEngine,
        private readonly paymentLimitsPolicy: PaymentLimitsPolicy,
        private readonly fraudPreventionPolicy: FraudPreventionPolicy
    ) { }

    async execute(dto: ProcessPaymentDTO): Promise<PaymentResultDTO> {
        // Step 1: Validate payment request
        const validation = this.paymentProcessingEngine.validatePaymentRequest({
            amount: dto.amount,
            currency: dto.currency,
            method: dto.method as unknown as any,
            userId: dto.userId,
            orderId: dto.orderId,
        });

        if (!validation.isValid) {
            businessMetrics.paymentOutcomesTotal.inc({ status: 'failed' });
            return {
                success: false,
                paymentId: '',
                status: PaymentStatus.FAILED,
                message: validation.errors.join(', '),
            };
        }

        // Step 2: Check payment limits
        const dailyTotal = await this.paymentRepository.getTotalAmountByUserId(
            dto.userId,
            this.getStartOfDay(),
            new Date()
        );

        const monthlyTotal = await this.paymentRepository.getTotalAmountByUserId(
            dto.userId,
            this.getStartOfMonth(),
            new Date()
        );

        const dailyCount = await this.paymentRepository.getPaymentCountByUserId(
            dto.userId,
            this.getStartOfDay(),
            new Date()
        );

        const limitsCheck = this.paymentLimitsPolicy.isWithinLimits(
            dto.amount,
            dto.method,
            dailyTotal,
            monthlyTotal,
            dailyCount
        );

        if (!limitsCheck.isWithinLimits) {
            businessMetrics.paymentOutcomesTotal.inc({ status: 'failed' });
            return {
                success: false,
                paymentId: '',
                status: PaymentStatus.FAILED,
                message: `Payment limits exceeded: ${limitsCheck.violations.join(', ')}`,
            };
        }

        // Step 3: Fraud assessment
        const fraudAssessment = await this.fraudEngine.assessTransaction({
            transactionId: this.generateId(),
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
            fraudAssessment.riskScore
        );

        // Step 4: Create payment entity
        const paymentId = this.generateId();
        // Cast PaymentMethod to PaymentMethodType as they share the same string values
        const paymentMethodType = dto.method as unknown as any;

        const provider = this.paymentProcessingEngine.selectPaymentProvider(paymentMethodType);
        const fees = this.paymentProcessingEngine.calculateFees(dto.amount, paymentMethodType);

        const payment = new Payment({
            id: paymentId,
            orderId: dto.orderId,
            userId: dto.userId,
            amount: dto.amount,
            currency: dto.currency,
            method: dto.method,
            provider: provider,
            status: PaymentStatus.PENDING,
            metadata: {
                ...dto.metadata,
                phoneNumber: dto.customerInfo.phoneNumber,
                customerEmail: dto.customerInfo.email,
                customerName: dto.customerInfo.name,
                ipAddress: dto.customerInfo.ipAddress,
                userAgent: dto.metadata?.userAgent,
                fees: {
                    platformFee: fees.platformFee,
                    providerFee: fees.providerFee,
                    totalFee: fees.totalFee
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
        if (fraudDecision.autoDecline) {
            payment.markAsFailed(`Fraud detected: ${fraudDecision.reason}`);
            await this.paymentRepository.save(payment);
            businessMetrics.paymentOutcomesTotal.inc({ status: 'failed' });

            return {
                success: false,
                paymentId: payment.id,
                status: payment.status,
                message: 'Payment declined due to security concerns',
                fraudAssessment: {
                    riskScore: fraudAssessment.riskScore,
                    riskLevel: fraudAssessment.riskLevel,
                    recommendation: fraudAssessment.recommendation,
                },
            };
        }

        if (fraudDecision.requiresManualReview) {
            await this.paymentRepository.save(payment);
            businessMetrics.paymentOutcomesTotal.inc({ status: 'pending' });

            return {
                success: false,
                paymentId: payment.id,
                status: payment.status,
                message: 'Payment requires manual review',
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

            const paymentProvider = this.paymentProviderFactory(provider);
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
                if (providerResponse.status === 'COMPLETED') {
                    payment.markAsCompleted(providerResponse.providerTransactionId);
                }

                await this.paymentRepository.update(payment);

                businessMetrics.paymentOutcomesTotal.inc({ status: 'success' });
                return {
                    success: true,
                    paymentId: payment.id,
                    status: payment.status,
                    redirectUrl: providerResponse.redirectUrl,
                    providerReference: providerResponse.providerReference,
                    message: providerResponse.message || 'Payment initiated successfully',
                };
            } else {
                payment.markAsFailed(providerResponse.message || 'Provider error');
                await this.paymentRepository.update(payment);
                businessMetrics.paymentOutcomesTotal.inc({ status: 'failed' });

                return {
                    success: false,
                    paymentId: payment.id,
                    status: payment.status,
                    message: providerResponse.message || 'Payment processing failed',
                };
            }
        } catch (error) {
            payment.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
            await this.paymentRepository.update(payment);
            businessMetrics.paymentOutcomesTotal.inc({ status: 'failed' });

            return {
                success: false,
                paymentId: payment.id,
                status: payment.status,
                message: 'Payment processing failed',
            };
        }
    }

    private generateId(): string {
        return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
