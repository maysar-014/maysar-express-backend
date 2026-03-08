import { OptimisticLockError } from '../../../../../shared/errors/optimistic-lock.error';
import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import type { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { WalletRepository } from './wallet.repository';

const createWallet = (): Wallet =>
  new Wallet({
    id: 'wallet-1',
    userId: 'user-1',
    balance: 100,
    currency: 'TZS',
    status: WalletStatus.ACTIVE,
    frozenAmount: 10,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    codCommitmentLimit: 50,
    codCommitmentUsed: 5,
    codCommitmentCount: 1,
    version: 1
  });

const createPrismaMock = () => ({
  wallet_Wallet: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn()
  },
  $queryRaw: jest.fn()
});

describe('WalletRepository', () => {
  it('satisfies the domain wallet repository contract', () => {
    const prismaMock = createPrismaMock();
    const repository: IWalletRepository = new WalletRepository(prismaMock as never);

    expect(repository).toBeInstanceOf(WalletRepository);
  });

  it('saves wallets and maps lookup responses to domain wallet entities', async () => {
    const prismaMock = createPrismaMock();
    const repository = new WalletRepository(prismaMock as never);
    const wallet = createWallet();

    await repository.save(wallet);
    expect(prismaMock.wallet_Wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'wallet-1',
          userId: 'user-1',
          version: 0
        })
      })
    );

    const dbWallet = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 120,
      currency: 'TZS',
      status: 'ACTIVE',
      frozenAmount: 20,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      codCommitmentLimit: 80,
      codCommitmentUsed: 10,
      codCommitmentCount: 2,
      version: 2
    };
    prismaMock.wallet_Wallet.findUnique.mockResolvedValueOnce(dbWallet);
    prismaMock.wallet_Wallet.findFirst.mockResolvedValueOnce(dbWallet);

    const byId = await repository.findById('wallet-1');
    const byUser = await repository.findByUserId('user-1');

    expect(byId?.id).toBe('wallet-1');
    expect(byUser?.userId).toBe('user-1');
  });

  it('throws optimistic lock error when update detects a stale version', async () => {
    const prismaMock = createPrismaMock();
    prismaMock.wallet_Wallet.updateMany.mockResolvedValue({ count: 0 });
    const repository = new WalletRepository(prismaMock as never);

    await expect(repository.update(createWallet())).rejects.toBeInstanceOf(OptimisticLockError);
  });

  it('supports balance updates, row locking, and not-found balance checks', async () => {
    const prismaMock = createPrismaMock();
    const repository = new WalletRepository(prismaMock as never);

    prismaMock.wallet_Wallet.update.mockResolvedValue(undefined);
    await repository.updateBalance('wallet-1', 5, -2);
    expect(prismaMock.wallet_Wallet.update).toHaveBeenCalled();

    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: 'wallet-1',
        userId: 'user-1',
        balance: 100,
        currency: 'TZS',
        status: 'ACTIVE',
        frozenAmount: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        codCommitmentLimit: 0,
        codCommitmentUsed: 0,
        codCommitmentCount: 0,
        version: 0
      }
    ]);
    const locked = await repository.lockForTransaction('wallet-1');
    expect(locked.id).toBe('wallet-1');

    prismaMock.wallet_Wallet.findUnique.mockResolvedValueOnce({
      balance: 140,
      frozenAmount: 15
    });
    await expect(repository.getBalance('wallet-1')).resolves.toEqual({
      balance: 140,
      frozenAmount: 15
    });

    prismaMock.wallet_Wallet.findUnique.mockResolvedValueOnce(null);
    await expect(repository.getBalance('missing-wallet')).rejects.toThrow('Wallet missing-wallet not found');
  });
});
