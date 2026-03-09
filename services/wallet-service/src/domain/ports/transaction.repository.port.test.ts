import type { Transaction } from '../entities/transaction.entity';
import type { ITransactionRepository } from './transaction.repository.port';

describe('ITransactionRepository port', () => {
  it('supports save and finder operations', async () => {
    const tx = { id: 'tx-1' } as unknown as Transaction;
    const repo: ITransactionRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(tx),
      findByWalletId: jest.fn().mockResolvedValue([tx]),
      findByPaymentId: jest.fn().mockResolvedValue([tx])
    };

    await repo.save(tx);
    expect(await repo.findById('tx-1')).toBe(tx);
    expect((await repo.findByWalletId('wallet-1')).length).toBe(1);
    expect((await repo.findByPaymentId('pay-1')).length).toBe(1);
  });
});
