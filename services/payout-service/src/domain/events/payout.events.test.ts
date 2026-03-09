import { PayoutDomainEvent } from './payout.events';

describe('payout events', () => {
  const base = {
    eventId: 'evt-1',
    aggregateId: 'payout-1',
    aggregateType: 'Payout' as const,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    version: 1
  };

  it('supports initiated/processing/completed payloads', () => {
    const initiated: PayoutDomainEvent = {
      ...base,
      eventType: 'PayoutInitiated',
      payload: {
        payoutId: 'p-1',
        sellerId: 'seller-1',
        amount: 10000,
        currency: 'TZS',
        method: 'BANK_TRANSFER',
        requestedAt: new Date('2026-01-01T00:05:00.000Z')
      }
    };
    const processing: PayoutDomainEvent = {
      ...base,
      eventType: 'PayoutProcessing',
      payload: {
        payoutId: 'p-1',
        sellerId: 'seller-1',
        amount: 10000,
        fee: 200,
        netAmount: 9800,
        processedAt: new Date('2026-01-01T00:10:00.000Z')
      }
    };

    expect(initiated.eventType).toBe('PayoutInitiated');
    expect((processing as any).payload.netAmount).toBe(9800);
  });

  it('supports failed/cancelled events', () => {
    const failed: PayoutDomainEvent = {
      ...base,
      eventType: 'PayoutFailed',
      payload: {
        payoutId: 'p-1',
        sellerId: 'seller-1',
        amount: 10000,
        failureReason: 'provider_down',
        failedAt: new Date('2026-01-01T01:00:00.000Z')
      }
    };
    const cancelled: PayoutDomainEvent = {
      ...base,
      eventType: 'PayoutCancelled',
      payload: {
        payoutId: 'p-1',
        sellerId: 'seller-1',
        reason: 'user_request',
        cancelledAt: new Date('2026-01-01T01:05:00.000Z')
      }
    };

    expect((failed as any).payload.failureReason).toBe('provider_down');
    expect(cancelled.eventType).toBe('PayoutCancelled');
  });
});
