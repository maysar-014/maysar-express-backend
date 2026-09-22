import {
  IPaymentProvider,
  PaymentProviderRequest,
  PaymentProviderResponse,
  PaymentStatusResponse,
  PayoutRequest,
  PayoutResponse,
  WebhookPayload,
} from "../../../domain/repositories/payment-provider.gateway";
import { SandboxLedger, isSandboxReference } from "./sandbox-ledger";
import {
  resolveSandboxOutcome,
  resolveCompletionDelayMs,
  outcomeToTerminal,
} from "./sandbox-behavior";

interface SandboxSimulatorConfig {
  /** The payment-method channel this simulator instance serves (e.g. MPESA). */
  channel: string;
  /** Canonical method code (e.g. MPESA, AIRTEL_MONEY). */
  methodCode: string;
  /** Shared ledger — sandbox transactions must be verifiable process-wide. */
  ledger: SandboxLedger;
  /**
   * Late-bound webhook dispatcher. On terminal completion the simulator
   * delivers a provider-style webhook through the REAL webhook pipeline
   * (HandlePaymentWebhookUseCase), exercising callback → verification →
   * state transition → order synchronization exactly as in live.
   */
  dispatchWebhook?: (payload: WebhookPayload) => Promise<void>;
  env?: Record<string, string | undefined>;
}

/**
 * Sandbox simulator adapter — one instance per payment-method channel.
 *
 * When a method is configured as `sandbox`, this adapter replaces the real
 * provider integration and simulates a fully functional provider: initiation,
 * provider reference generation, asynchronous processing, completion (or
 * decline/timeout/cancellation), and a webhook callback delivered through the
 * production webhook pipeline.
 *
 * It is NOT a fake "pretend success" shortcut: the same ProcessPayment →
 * provider → callback → verify → state-transition lifecycle runs; only the
 * provider's network side is simulated in-process.
 */
export class SandboxSimulatorAdapter implements IPaymentProvider {
  private readonly ledger: SandboxLedger;
  private readonly dispatchWebhook?: (payload: WebhookPayload) => Promise<void>;
  private readonly env: Record<string, string | undefined>;

  constructor(private readonly config: SandboxSimulatorConfig) {
    this.ledger = config.ledger;
    this.dispatchWebhook = config.dispatchWebhook;
    this.env =
      config.env ?? (process.env as Record<string, string | undefined>);
  }

  getProviderName(): string {
    return `sandbox-simulator:${this.config.channel.toLowerCase()}`;
  }

  async processPayment(
    request: PaymentProviderRequest,
  ): Promise<PaymentProviderResponse> {
    if (!(request.amount > 0)) {
      return {
        success: false,
        status: "FAILED",
        message: "Sandbox payment requires a positive amount",
      };
    }

    const providerReference = `sbx_${this.config.channel.toLowerCase()}_${request.paymentId}_${Date.now()}`;
    const providerTransactionId = `sbxtxn_${request.paymentId}`;

    // Same shape as a real initiation: accepted by the provider and moving
    // into PROCESSING. The outcome is resolved deterministically at
    // initiation so tests can drive SUCCESS / declines / timeouts explicitly.
    const outcome = resolveSandboxOutcome(request.metadata);
    this.ledger.create({
      providerReference,
      providerTransactionId,
      methodCode: this.config.methodCode,
      channel: this.config.channel,
      amount: request.amount,
      currency: request.currency,
      outcome,
    });
    this.ledger.markProcessing(providerReference);

    const delayMs = resolveCompletionDelayMs(this.env);
    const timer = setTimeout(() => {
      void this.complete(providerReference).catch(() => {
        // Completion dispatch failures must never crash the process; the
        // transaction state remains queryable via checkPaymentStatus.
      });
    }, delayMs);
    // Never keep the event loop alive just for a simulation timer.
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    return {
      success: true,
      status: "PROCESSING",
      providerReference,
      providerTransactionId,
      message: "Sandbox payment initiated (simulated provider)",
      metadata: {
        simulated: true,
        environment: "SANDBOX",
        channel: this.config.channel,
        completionDelayMs: delayMs,
      },
    };
  }

  async checkPaymentStatus(
    providerReference: string,
  ): Promise<PaymentStatusResponse> {
    const tx = this.ledger.get(providerReference);
    if (!tx || !isSandboxReference(providerReference)) {
      // Verification failure for an unknown reference — never fabricate a
      // success for a transaction the ledger does not know about.
      return {
        paymentId: providerReference,
        providerReference,
        status: "FAILED",
        amount: 0,
        currency: "TZS",
        failureReason: "PAYMENT_VERIFICATION_FAILED: unknown sandbox reference",
      };
    }
    return {
      paymentId: tx.methodCode,
      providerReference: tx.providerReference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      completedAt: tx.completedAt,
      failureReason: tx.failureReason,
    };
  }

  async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
    return {
      success: true,
      providerPayoutId: `sbxpayout_${request.payoutId}_${Date.now()}`,
      status: "PROCESSING",
      message: "Sandbox payout initiated (simulated provider)",
      estimatedCompletionTime: new Date(
        Date.now() + resolveCompletionDelayMs(this.env),
      ),
    };
  }

  /**
   * Accepts a provider-style webhook for a sandbox transaction. The ledger
   * enforces terminal immutability, so a repeated callback can never
   * double-process the payment.
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const tx = this.ledger.get(payload.providerReference);
    if (!tx) {
      return;
    }
    this.ledger.recordWebhookDelivery(payload.providerReference);
    const status = String(payload.status || "").toUpperCase();
    if (status === "COMPLETED" || status === "SUCCESS") {
      this.ledger.applyTerminal(payload.providerReference, "COMPLETED");
    } else if (status === "CANCELLED") {
      this.ledger.applyTerminal(payload.providerReference, "CANCELLED");
    } else if (status === "FAILED") {
      this.ledger.applyTerminal(
        payload.providerReference,
        "FAILED",
        "PAYMENT_FAILED",
      );
    }
  }

  /** Internal: resolve the scheduled outcome and dispatch the webhook. */
  private async complete(providerReference: string): Promise<void> {
    const tx = this.ledger.get(providerReference);
    if (!tx || !this.dispatchWebhook) {
      return;
    }
    const outcome = tx.outcome ?? "SUCCESS";
    const terminal = outcomeToTerminal(outcome);
    const settled = this.ledger.applyTerminal(
      providerReference,
      terminal.status,
      terminal.failureReason,
    );
    // Only fire the callback when THIS call actually settled the transaction
    // (a concurrent settlement would return the pre-existing terminal state).
    if (settled.status !== terminal.status) {
      return;
    }
    // The auto-completion is itself a delivered callback — count it once.
    this.ledger.recordWebhookDelivery(providerReference);
    await this.dispatchWebhook({
      eventType: "payment.status.update",
      providerReference,
      status: terminal.status,
      amount: tx.amount,
      currency: tx.currency,
      timestamp: new Date(),
      metadata: {
        transactionId: tx.providerTransactionId,
        simulated: true,
        environment: "SANDBOX",
        channel: tx.channel,
      },
    });
  }
}
