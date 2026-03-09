import { WalletService } from './wallet-service-contracts';

describe('Wallet service contracts', () => {
  it('defines wallet command/event payloads', () => {
    const debit: WalletService.Commands.DebitWallet = {
      walletId: 'wallet-1',
      amount: { amount: 2500, currency: 'TZS' },
      referenceType: 'order',
      referenceId: 'ord-1',
      description: 'Order debit'
    };
    const credited: WalletService.Events.WalletCredited = {
      transactionId: 'tx-2',
      walletId: 'wallet-1',
      amount: { amount: 1000, currency: 'TZS' },
      referenceType: 'refund',
      referenceId: 'ord-1',
      creditedAt: new Date('2026-01-01T00:00:00.000Z')
    };

    expect(debit.amount.currency).toBe('TZS');
    expect(credited.referenceType).toBe('refund');
  });

  it('supports transaction completion status union', () => {
    const completed: WalletService.Events.TransactionCompleted = {
      transactionId: 'tx-1',
      status: 'completed',
      completedAt: new Date('2026-01-01T00:01:00.000Z')
    };

    expect(completed.status).toBe('completed');
  });
});
