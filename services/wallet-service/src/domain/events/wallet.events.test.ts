import { WalletDomainEvent } from './wallet.events';

describe('wallet events', () => {
  const base = {
    eventId: 'evt-1',
    aggregateId: 'wallet-1',
    aggregateType: 'Wallet' as const,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    version: 1
  };

  it('supports credited/debited/frozen event payload shapes', () => {
    const credited: WalletDomainEvent = {
      ...base,
      eventType: 'WalletCredited',
      payload: {
        walletId: 'wallet-1',
        userId: 'user-1',
        amount: 1000,
        currency: 'TZS',
        balanceBefore: 2000,
        balanceAfter: 3000,
        transactionId: 'tx-1',
        reason: 'refund'
      }
    };
    const frozen: WalletDomainEvent = {
      ...base,
      eventType: 'FundsFrozen',
      payload: {
        walletId: 'wallet-1',
        userId: 'user-1',
        frozenAmount: 500,
        reason: 'hold',
        frozenAt: new Date('2026-01-01T01:00:00.000Z')
      }
    };

    expect(credited.eventType).toBe('WalletCredited');
    expect((credited as any).payload.balanceAfter).toBe(3000);
    expect(frozen.eventType).toBe('FundsFrozen');
    expect((frozen as any).payload.frozenAmount).toBe(500);
  });

  it('supports hold and status lifecycle events', () => {
    const holdPlaced: WalletDomainEvent = {
      ...base,
      eventType: 'HoldPlaced',
      payload: {
        holdId: 'h-1',
        walletId: 'wallet-1',
        userId: 'user-1',
        amount: 200,
        reason: 'cod',
        expiresAt: new Date('2026-01-02T00:00:00.000Z')
      }
    };
    const statusChanged: WalletDomainEvent = {
      ...base,
      eventType: 'WalletStatusChanged',
      payload: {
        walletId: 'wallet-1',
        userId: 'user-1',
        oldStatus: 'ACTIVE',
        newStatus: 'SUSPENDED',
        reason: 'risk',
        changedAt: new Date('2026-01-01T03:00:00.000Z')
      }
    };

    expect(holdPlaced.eventType).toBe('HoldPlaced');
    expect((statusChanged as any).payload.newStatus).toBe('SUSPENDED');
  });
});
