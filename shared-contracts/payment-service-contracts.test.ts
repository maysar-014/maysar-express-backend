import { PaymentService } from './payment-service-contracts';

describe('Payment service contracts', () => {
  it('defines payment command/event payload types', () => {
    const process: PaymentService.Commands.ProcessPayment = {
      orderId: 'ord-1',
      userId: 'user-1',
      amount: { amount: 5000, currency: 'TZS' },
      paymentMethodId: 'pm-1'
    };
    const failed: PaymentService.Events.PaymentFailed = {
      paymentId: 'pay-1',
      orderId: 'ord-1',
      amount: { amount: 5000, currency: 'TZS' },
      reason: 'insufficient_funds',
      failedAt: new Date('2026-01-01T02:00:00.000Z')
    };

    expect(process.amount.amount).toBe(5000);
    expect(failed.reason).toBe('insufficient_funds');
  });

  it('supports optional partial refund amount', () => {
    const refund: PaymentService.Commands.RefundPayment = {
      paymentId: 'pay-1',
      reason: 'partial_return',
      amount: { amount: 1000, currency: 'TZS' }
    };

    expect(refund.amount?.amount).toBe(1000);
  });
});
