import { WalletMapper } from './wallet.mapper';

describe('WalletMapper', () => {
  it('maps wallet-like domain object to wallet dto', () => {
    const wallet = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 32000,
      currency: 'TZS',
      status: 'ACTIVE',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T01:00:00.000Z')
    };

    const dto = WalletMapper.toDto(wallet as never);
    expect(dto).toEqual(wallet);
  });

  it('maps transaction-like domain object to transaction dto', () => {
    const tx = {
      id: 'tx-1',
      walletId: 'wallet-1',
      type: 'DEBIT',
      amount: 8000,
      description: 'Order payment',
      balanceAfter: 32000,
      createdAt: new Date('2026-02-01T01:00:00.000Z')
    };

    const dto = WalletMapper.toTransactionDto(tx as never);
    expect(dto).toEqual(tx);
  });
});
