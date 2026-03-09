import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { UnfreezeFundsUseCase } from './unfreeze-funds.use-case';

describe('UnfreezeFundsUseCase', () => {
  const auditInfo = new AuditInfo({
    actor: 'admin-1',
    actorType: ActorType.ADMIN,
    action: 'UNFREEZE',
    reason: 'resolved',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  it('returns failure when wallet is not found', async () => {
    const useCase = new UnfreezeFundsUseCase(
      { findByUserId: jest.fn().mockResolvedValue(null), update: jest.fn() } as never,
      { save: jest.fn() } as never
    );
    const result = await useCase.execute({
      userId: 'u1',
      amount: 100,
      description: 'unfreeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result).toEqual({ success: false, message: 'Wallet not found' });
  });

  it('unfreezes funds and records transaction', async () => {
    const wallet = {
      id: 'w1',
      balance: 500,
      frozenAmount: 100,
      currency: 'TZS',
      unfreeze: jest.fn().mockImplementation(() => {
        wallet.frozenAmount -= 40;
      })
    };
    const walletRepo = { findByUserId: jest.fn().mockResolvedValue(wallet), update: jest.fn().mockResolvedValue(undefined) };
    const txRepo = { save: jest.fn().mockResolvedValue(undefined) };
    const useCase = new UnfreezeFundsUseCase(walletRepo as never, txRepo as never);

    const result = await useCase.execute({
      userId: 'u1',
      amount: 40,
      description: 'unfreeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result.success).toBe(true);
    expect(result.walletId).toBe('w1');
    expect(txRepo.save).toHaveBeenCalledTimes(1);
  });

  it('returns failure when domain unfreeze throws', async () => {
    const wallet = {
      id: 'w1',
      balance: 500,
      frozenAmount: 20,
      currency: 'TZS',
      unfreeze: jest.fn().mockImplementation(() => {
        throw new Error('not enough frozen funds');
      })
    };
    const useCase = new UnfreezeFundsUseCase(
      { findByUserId: jest.fn().mockResolvedValue(wallet), update: jest.fn() } as never,
      { save: jest.fn() } as never
    );

    const result = await useCase.execute({
      userId: 'u1',
      amount: 100,
      description: 'unfreeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('not enough frozen funds');
  });
});
