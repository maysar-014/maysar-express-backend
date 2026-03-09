import type { IWalletRepository } from './wallet.repository.port';
import type { Wallet } from '../entities/wallet.entity';

describe('IWalletRepository contract', () => {
  it('supports wallet persistence, locking, and balance operations', async () => {
    const wallet = { id: 'wallet-1' } as unknown as Wallet;
    const repo: IWalletRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(wallet),
      findByUserId: jest.fn().mockResolvedValue(wallet),
      update: jest.fn().mockResolvedValue(undefined),
      updateBalance: jest.fn().mockResolvedValue(undefined),
      lockForTransaction: jest.fn().mockResolvedValue(wallet),
      getBalance: jest.fn().mockResolvedValue({ balance: 50000, frozenAmount: 7000 })
    };

    expect(await repo.findById('wallet-1')).toBe(wallet);
    expect(await repo.findByUserId('user-1')).toBe(wallet);
    expect(await repo.lockForTransaction('wallet-1')).toBe(wallet);
    await expect(repo.getBalance('wallet-1')).resolves.toEqual({
      balance: 50000,
      frozenAmount: 7000
    });
  });
});
