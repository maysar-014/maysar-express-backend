import type { DomainEvent, PaymentCompleted, WalletDebited } from './payment.events';

describe('payment.events contracts', () => {
  it('supports strongly typed payment-completed domain event shape', () => {
    const event: PaymentCompleted = {
      eventId: 'evt-1',
      eventType: 'PaymentCompleted',
      aggregateId: 'payment-1',
      aggregateType: 'Payment',
      occurredAt: new Date('2026-03-08T00:00:00.000Z'),
      version: 1,
      payload: {
        paymentId: 'payment-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 120,
        currency: 'TZS',
        completedAt: new Date('2026-03-08T00:00:00.000Z')
      }
    };

    const baseEvent: DomainEvent = event;
    expect(baseEvent.eventType).toBe('PaymentCompleted');
    expect(event.payload.orderId).toBe('order-1');
  });

  it('supports strongly typed wallet-debited event shape', () => {
    const event: WalletDebited = {
      eventId: 'evt-2',
      eventType: 'WalletDebited',
      aggregateId: 'wallet-1',
      aggregateType: 'Wallet',
      occurredAt: new Date('2026-03-08T00:00:00.000Z'),
      version: 1,
      payload: {
        walletId: 'wallet-1',
        userId: 'user-2',
        amount: 50,
        currency: 'TZS',
        balanceBefore: 200,
        balanceAfter: 150,
        transactionId: 'txn-1',
        reason: 'order_payment'
      }
    };

    expect(event.eventType).toBe('WalletDebited');
    expect(event.payload.balanceAfter).toBe(150);
  });
});
