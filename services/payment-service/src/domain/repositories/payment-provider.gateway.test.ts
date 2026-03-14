import {
  IPaymentProvider,
  PaymentProviderRequest,
  PaymentStatusResponse,
  PayoutRequest,
  WebhookPayload
} from './payment-provider.gateway';

class FakePaymentProvider implements IPaymentProvider {
  private readonly payments = new Map<string, PaymentStatusResponse>();
  private readonly webhookEvents: WebhookPayload[] = [];

  async processPayment(request: PaymentProviderRequest) {
    const providerReference = `ref-${request.paymentId}`;
    this.payments.set(providerReference, {
      paymentId: request.paymentId,
      providerReference,
      status: 'PENDING',
      amount: request.amount,
      currency: request.currency
    });
    return {
      success: true,
      providerReference,
      providerTransactionId: `txn-${request.paymentId}`,
      status: 'PENDING'
    };
  }

  async checkPaymentStatus(providerReference: string): Promise<PaymentStatusResponse> {
    return this.payments.get(providerReference)!;
  }

  async processPayout(request: PayoutRequest) {
    return {
      success: true,
      providerPayoutId: `payout-${request.payoutId}`,
      status: 'PROCESSING'
    };
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    this.webhookEvents.push(payload);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return signature === `sig:${payload}`;
  }

  getProviderName(): string {
    return 'fake-provider';
  }

  getWebhookEventCount(): number {
    return this.webhookEvents.length;
  }
}

describe('IPaymentProvider contract', () => {
  let provider: FakePaymentProvider;

  beforeEach(() => {
    provider = new FakePaymentProvider();
  });

  it('processes payment and returns provider references', async () => {
    const result = await provider.processPayment({
      paymentId: 'pay-1',
      amount: 12000,
      currency: 'TZS',
      method: 'CARD',
      customerInfo: { userId: 'u1' }
    });

    expect(result.success).toBe(true);
    expect(result.providerReference).toBe('ref-pay-1');
    expect(result.providerTransactionId).toBe('txn-pay-1');
  });

  it('checks persisted payment status by provider reference', async () => {
    await provider.processPayment({
      paymentId: 'pay-2',
      amount: 8500,
      currency: 'TZS',
      method: 'WALLET',
      customerInfo: { userId: 'u2' }
    });

    const status = await provider.checkPaymentStatus('ref-pay-2');

    expect(status.paymentId).toBe('pay-2');
    expect(status.status).toBe('PENDING');
    expect(status.amount).toBe(8500);
  });

  it('processes payout request and returns payout status', async () => {
    const result = await provider.processPayout({
      payoutId: 'po-1',
      amount: 30000,
      currency: 'TZS',
      method: 'MOBILE_MONEY',
      recipientInfo: { sellerId: 's1', phoneNumber: '+255700000001' }
    });

    expect(result.success).toBe(true);
    expect(result.providerPayoutId).toBe('payout-po-1');
    expect(result.status).toBe('PROCESSING');
  });

  it('stores webhook callback payloads', async () => {
    await provider.handleWebhook({
      eventType: 'payment.completed',
      providerReference: 'ref-pay-3',
      status: 'COMPLETED',
      amount: 5000,
      currency: 'TZS',
      timestamp: new Date('2026-03-09T00:00:00.000Z')
    });

    expect(provider.getWebhookEventCount()).toBe(1);
  });

  it('validates webhook signatures deterministically', () => {
    expect(provider.verifyWebhookSignature('body', 'sig:body')).toBe(true);
    expect(provider.verifyWebhookSignature('body', 'invalid')).toBe(false);
  });

  it('exposes provider name', () => {
    expect(provider.getProviderName()).toBe('fake-provider');
  });
});

