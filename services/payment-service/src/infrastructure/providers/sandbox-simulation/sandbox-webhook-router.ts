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
import { SandboxSimulatorAdapter } from "./sandbox-simulator.adapter";

/**
 * Sandbox-aware provider router for the webhook/status pipeline.
 *
 * Webhook callbacks and status verifications arrive with only a provider
 * reference. This router inspects the reference prefix and delegates to:
 *  - the sandbox simulator's ledger for `sbx_*` references (simulated
 *    transactions — verification must hit the simulation, never the network),
 *  - the real provider gateway for everything else (live transactions).
 */
export class SandboxAwareProviderRouter implements IPaymentProvider {
  private readonly sandboxProvider: IPaymentProvider;

  constructor(
    private readonly ledger: SandboxLedger,
    private readonly liveProvider: IPaymentProvider,
    sandboxProvider?: IPaymentProvider,
  ) {
    this.sandboxProvider =
      sandboxProvider ??
      new SandboxSimulatorAdapter({
        channel: "ROUTER",
        methodCode: "ROUTER",
        ledger,
      });
  }

  private isSandbox(providerReference: string): boolean {
    return isSandboxReference(providerReference);
  }

  async checkPaymentStatus(
    providerReference: string,
  ): Promise<PaymentStatusResponse> {
    return this.isSandbox(providerReference)
      ? this.sandboxProvider.checkPaymentStatus(providerReference)
      : this.liveProvider.checkPaymentStatus(providerReference);
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    return this.isSandbox(payload.providerReference)
      ? this.sandboxProvider.handleWebhook(payload)
      : this.liveProvider.handleWebhook(payload);
  }

  // Initiation always happens through the method-specific provider resolved
  // by the registry — the router never starts payments.
  async processPayment(
    _request: PaymentProviderRequest,
  ): Promise<PaymentProviderResponse> {
    throw new Error(
      "SandboxAwareProviderRouter does not initiate payments; resolve the method provider from PaymentMethodProviderRegistry",
    );
  }

  async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
    throw new Error(
      "SandboxAwareProviderRouter does not process payouts; resolve the method provider from PaymentMethodProviderRegistry",
    );
  }

  getProviderName(): string {
    return "router:sandbox-aware";
  }
}
