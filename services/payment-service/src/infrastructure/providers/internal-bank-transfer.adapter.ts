import {
  IPaymentProvider,
  PaymentProviderRequest,
  PaymentProviderResponse,
  PaymentStatusResponse,
  PayoutRequest,
  PayoutResponse,
  WebhookPayload,
} from "../../domain/repositories/payment-provider.gateway";

/**
 * Internal Bank Transfer adapter — the BANK_TRANSFER payment method.
 *
 * Initiation creates a provider-side instruction/reference (the buyer is shown
 * Maysar's bank account details by the checkout UI). The payment then remains
 * in a reconciliation-driven state until the manual transfer is confirmed via
 * the reconciliation job or an admin/ops confirmation — the same flow expected
 * of a real bank-transfer provider in production.
 */
export class InternalBankTransferAdapter implements IPaymentProvider {
  getProviderName(): string {
    return "internal-bank-transfer";
  }

  async processPayment(
    request: PaymentProviderRequest,
  ): Promise<PaymentProviderResponse> {
    return {
      success: true,
      status: "PROCESSING",
      providerReference: `bank_${request.paymentId}`,
      providerTransactionId: `bktx_${request.paymentId}`,
      message:
        "Bank transfer instruction created — awaiting transfer confirmation",
      metadata: {
        provider: this.getProviderName(),
        lifecycle: "bank-transfer-instruction",
        settlementHint: "Match incoming transfers by payment reference",
      },
    };
  }

  async checkPaymentStatus(
    providerReference: string,
  ): Promise<PaymentStatusResponse> {
    // Reconciliation is performed by the bank-instruction reconciliation job;
    // a bare status query reports the instruction as still pending.
    return {
      paymentId: providerReference,
      providerReference,
      status: "PENDING",
      amount: 0,
      currency: "TZS",
    };
  }

  async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
    return {
      success: false,
      status: "NOT_SUPPORTED",
      message: "Bank-transfer payouts are not enabled yet",
      estimatedCompletionTime: undefined,
    };
  }

  async handleWebhook(_payload: WebhookPayload): Promise<void> {
    // Bank transfers are confirmed through reconciliation, not external webhooks.
  }
}
