import type {
  CreditWalletDto,
  DebitWalletDto,
  TransactionResponseDto,
  WalletResponseDto
} from './wallet.dto';

describe('wallet DTO contracts', () => {
  it('supports credit and debit wallet payloads', () => {
    const credit: CreditWalletDto = {
      userId: 'user-1',
      amount: 50000,
      description: 'Wallet top up'
    };
    const debit: DebitWalletDto = {
      userId: 'user-1',
      amount: 10000,
      description: 'Purchase payment',
      metadata: { orderId: 'order-1' }
    };

    expect(credit.amount).toBe(50000);
    expect(debit.metadata?.orderId).toBe('order-1');
  });

  it('supports wallet and transaction response payloads', () => {
    const wallet: WalletResponseDto = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 40000,
      currency: 'TZS',
      status: 'ACTIVE',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T01:00:00.000Z')
    };
    const tx: TransactionResponseDto = {
      id: 'tx-1',
      walletId: 'wallet-1',
      type: 'DEBIT',
      amount: 10000,
      description: 'Order payment',
      balanceAfter: 40000,
      createdAt: new Date('2026-02-01T01:00:00.000Z')
    };

    expect(wallet.status).toBe('ACTIVE');
    expect(tx.balanceAfter).toBe(40000);
  });
});
