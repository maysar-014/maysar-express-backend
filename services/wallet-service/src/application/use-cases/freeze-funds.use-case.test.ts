import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { FreezeFundsUseCase } from './freeze-funds.use-case';

describe('FreezeFundsUseCase', () => {
  const auditInfo = new AuditInfo({
    actor: 'admin-1',
    actorType: ActorType.ADMIN,
    action: 'FREEZE',
    reason: 'risk',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  it('returns failure when wallet is not found', async () => {
    const useCase = new FreezeFundsUseCase(
      { findByUserId: jest.fn().mockResolvedValue(null), update: jest.fn() } as never,
      { save: jest.fn() } as never
    );
    const result = await useCase.execute({
      userId: 'u1',
      amount: 100,
      description: 'freeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result).toEqual({ success: false, message: 'Wallet not found' });
  });

  it('freezes funds and records transaction', async () => {
    const wallet = { id: 'w1', balance: 500, frozenAmount: 100, currency: 'TZS', freeze: jest.fn().mockImplementation(() => { wallet.frozenAmount += 50; }) };
    const walletRepo = { findByUserId: jest.fn().mockResolvedValue(wallet), update: jest.fn().mockResolvedValue(undefined) };
    const txRepo = { save: jest.fn().mockResolvedValue(undefined) };
    const useCase = new FreezeFundsUseCase(walletRepo as never, txRepo as never);

    const result = await useCase.execute({
      userId: 'u1',
      amount: 50,
      description: 'freeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result.success).toBe(true);
    expect(result.walletId).toBe('w1');
    expect(txRepo.save).toHaveBeenCalledTimes(1);
  });

  it('returns failure when domain freeze throws', async () => {
    const wallet = { id: 'w1', balance: 500, frozenAmount: 100, currency: 'TZS', freeze: jest.fn().mockImplementation(() => { throw new Error('insufficient'); }) };
    const useCase = new FreezeFundsUseCase(
      { findByUserId: jest.fn().mockResolvedValue(wallet), update: jest.fn() } as never,
      { save: jest.fn() } as never
    );

    const result = await useCase.execute({
      userId: 'u1',
      amount: 999,
      description: 'freeze',
      correlationId: 'corr',
      auditInfo
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('insufficient');
  });
});
