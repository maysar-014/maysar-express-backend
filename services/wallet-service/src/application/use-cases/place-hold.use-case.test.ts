import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { PlaceHoldUseCase } from './place-hold.use-case';

describe('PlaceHoldUseCase', () => {
  const auditInfo = new AuditInfo({
    actor: 'u1',
    actorType: ActorType.USER,
    action: 'PLACE_HOLD',
    reason: 'checkout',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  it('returns cached idempotency result when available', async () => {
    const idempotencyService = {
      checkIdempotency: jest.fn().mockResolvedValue({ holdId: 'cached', expiresAt: new Date('2026-01-01T01:00:00.000Z') }),
      storeResult: jest.fn()
    };
    const useCase = new PlaceHoldUseCase({} as never, {} as never, idempotencyService as never, { publishHoldPlaced: jest.fn() } as never);

    const result = await useCase.execute({
      userId: 'u1',
      amount: 100,
      currency: 'TZS',
      reason: 'cod',
      expiresInSeconds: 60,
      idempotencyKey: 'idem-1',
      auditInfo
    });

    expect(result.holdId).toBe('cached');
    expect(idempotencyService.storeResult).not.toHaveBeenCalled();
  });

  it('creates hold, persists, caches and publishes', async () => {
    const hold = { id: 'h1', expiresAt: new Date('2026-01-01T01:00:00.000Z') };
    const wallet = { id: 'w1', placeHold: jest.fn().mockReturnValue(hold) };
    const walletRepository = {
      findByUserId: jest.fn().mockResolvedValue(wallet),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const holdRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const idempotencyService = {
      checkIdempotency: jest.fn().mockResolvedValue(null),
      storeResult: jest.fn().mockResolvedValue(undefined)
    };
    const eventPublisher = { publishHoldPlaced: jest.fn().mockResolvedValue(undefined) };
    const useCase = new PlaceHoldUseCase(walletRepository as never, holdRepository as never, idempotencyService as never, eventPublisher as never);

    const result = await useCase.execute({
      userId: 'u1',
      amount: 100,
      currency: 'TZS',
      reason: 'cod',
      expiresInSeconds: 60,
      idempotencyKey: 'idem-1',
      auditInfo
    });

    expect(walletRepository.findByUserId).toHaveBeenCalledWith('u1');
    expect(wallet.placeHold).toHaveBeenCalledTimes(1);
    expect(walletRepository.update).toHaveBeenCalledWith(wallet);
    expect(holdRepository.save).toHaveBeenCalledWith(hold);
    expect(idempotencyService.storeResult).toHaveBeenCalledWith(expect.anything(), result);
    expect(eventPublisher.publishHoldPlaced).toHaveBeenCalled();
  });

  it('throws when wallet is not found', async () => {
    const walletRepository = { findByUserId: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const useCase = new PlaceHoldUseCase(
      walletRepository as never,
      { save: jest.fn() } as never,
      { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn() } as never,
      { publishHoldPlaced: jest.fn() } as never
    );

    await expect(
      useCase.execute({
        userId: 'u1',
        amount: 100,
        currency: 'TZS',
        reason: 'cod',
        expiresInSeconds: 60,
        idempotencyKey: 'idem-1',
        auditInfo
      })
    ).rejects.toThrow('Wallet not found');
  });
});
