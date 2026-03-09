import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { ReleaseHoldUseCase } from './release-hold.use-case';

describe('ReleaseHoldUseCase', () => {
  const auditInfo = new AuditInfo({
    actor: 'u1',
    actorType: ActorType.USER,
    action: 'RELEASE_HOLD',
    reason: 'cancel',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  it('returns early on idempotency cache hit', async () => {
    const idempotencyService = { checkIdempotency: jest.fn().mockResolvedValue({ released: true }), storeResult: jest.fn() };
    const useCase = new ReleaseHoldUseCase({} as never, {} as never, idempotencyService as never, { publishHoldReleased: jest.fn() } as never);

    await expect(
      useCase.execute({ holdId: 'h1', userId: 'u1', reason: 'cancel', idempotencyKey: 'idem', auditInfo })
    ).resolves.toBeUndefined();
    expect(idempotencyService.storeResult).not.toHaveBeenCalled();
  });

  it('releases hold and persists changes', async () => {
    const hold = { id: 'h1', walletId: 'w1' };
    const wallet = { id: 'w1', userId: 'u1', releaseHold: jest.fn() };
    const holdRepository = { findById: jest.fn().mockResolvedValue(hold), update: jest.fn().mockResolvedValue(undefined) };
    const walletRepository = { findById: jest.fn().mockResolvedValue(wallet), update: jest.fn().mockResolvedValue(undefined) };
    const idempotencyService = { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn().mockResolvedValue(undefined) };
    const eventPublisher = { publishHoldReleased: jest.fn().mockResolvedValue(undefined) };
    const useCase = new ReleaseHoldUseCase(walletRepository as never, holdRepository as never, idempotencyService as never, eventPublisher as never);

    await useCase.execute({ holdId: 'h1', userId: 'u1', reason: 'cancel', idempotencyKey: 'idem', auditInfo });

    expect(wallet.releaseHold).toHaveBeenCalledWith(hold);
    expect(walletRepository.update).toHaveBeenCalledWith(wallet);
    expect(holdRepository.update).toHaveBeenCalledWith(hold);
    expect(eventPublisher.publishHoldReleased).toHaveBeenCalledWith(expect.objectContaining({ holdId: 'h1' }));
  });

  it('throws for missing hold/wallet or unauthorized user', async () => {
    const useCaseMissingHold = new ReleaseHoldUseCase(
      { findById: jest.fn(), update: jest.fn() } as never,
      { findById: jest.fn().mockResolvedValue(null), update: jest.fn() } as never,
      { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn() } as never,
      { publishHoldReleased: jest.fn() } as never
    );
    await expect(
      useCaseMissingHold.execute({ holdId: 'h1', userId: 'u1', reason: 'cancel', idempotencyKey: 'idem', auditInfo })
    ).rejects.toThrow('Hold not found');

    const useCaseUnauthorized = new ReleaseHoldUseCase(
      { findById: jest.fn().mockResolvedValue({ id: 'w1', userId: 'other', releaseHold: jest.fn() }), update: jest.fn() } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'h1', walletId: 'w1' }), update: jest.fn() } as never,
      { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn() } as never,
      { publishHoldReleased: jest.fn() } as never
    );
    await expect(
      useCaseUnauthorized.execute({ holdId: 'h1', userId: 'u1', reason: 'cancel', idempotencyKey: 'idem', auditInfo })
    ).rejects.toThrow('Unauthorized to release this hold');
  });
});
