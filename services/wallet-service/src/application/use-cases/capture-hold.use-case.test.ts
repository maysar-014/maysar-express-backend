import crypto from 'crypto';
import { ActorType, AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { CaptureHoldUseCase } from './capture-hold.use-case';

describe('CaptureHoldUseCase', () => {
  const auditInfo = new AuditInfo({
    actor: 'u1',
    actorType: ActorType.USER,
    action: 'CAPTURE_HOLD',
    reason: 'settle',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  beforeEach(() => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cached result when idempotent', async () => {
    const idempotencyService = {
      checkIdempotency: jest.fn().mockResolvedValue({ captured: true, transactionId: 'tx-cached' }),
      storeResult: jest.fn()
    };
    const useCase = new CaptureHoldUseCase(
      {} as never,
      {} as never,
      {} as never,
      idempotencyService as never,
      { publishHoldCaptured: jest.fn() } as never
    );

    const result = await useCase.execute({
      holdId: 'h1',
      userId: 'u1',
      reason: 'settle',
      idempotencyKey: 'idem',
      correlationId: 'corr',
      auditInfo
    });

    expect(result.transactionId).toBe('tx-cached');
    expect(idempotencyService.storeResult).not.toHaveBeenCalled();
  });

  it('captures hold, saves transaction, and publishes event', async () => {
    const hold = { id: 'h1', walletId: 'w1', amount: { amount: 20, currency: 'TZS' } };
    const wallet = {
      id: 'w1',
      userId: 'u1',
      currency: 'TZS',
      balance: 100,
      frozenAmount: 30,
      captureHold: jest.fn()
    };
    const walletRepository = { findById: jest.fn().mockResolvedValue(wallet), update: jest.fn().mockResolvedValue(undefined) };
    const holdRepository = { findById: jest.fn().mockResolvedValue(hold), update: jest.fn().mockResolvedValue(undefined) };
    const transactionRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const idempotencyService = { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn().mockResolvedValue(undefined) };
    const eventPublisher = { publishHoldCaptured: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CaptureHoldUseCase(
      walletRepository as never,
      holdRepository as never,
      transactionRepository as never,
      idempotencyService as never,
      eventPublisher as never
    );

    const result = await useCase.execute({
      holdId: 'h1',
      userId: 'u1',
      reason: 'settle',
      idempotencyKey: 'idem',
      correlationId: 'corr',
      auditInfo
    });

    expect(wallet.captureHold).toHaveBeenCalledWith(hold);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    expect(idempotencyService.storeResult).toHaveBeenCalledWith(expect.anything(), result);
    expect(result.captured).toBe(true);
    expect(result.transactionId).toMatch(/^wal_tra_/);
    expect(eventPublisher.publishHoldCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ holdId: 'h1', walletId: 'w1', amount: 20 })
    );
  });

  it('throws for missing hold or wallet', async () => {
    const useCaseMissingHold = new CaptureHoldUseCase(
      { findById: jest.fn(), update: jest.fn() } as never,
      { findById: jest.fn().mockResolvedValue(null), update: jest.fn() } as never,
      { save: jest.fn() } as never,
      { checkIdempotency: jest.fn().mockResolvedValue(null), storeResult: jest.fn() } as never,
      { publishHoldCaptured: jest.fn() } as never
    );
    await expect(
      useCaseMissingHold.execute({ holdId: 'h1', userId: 'u1', reason: 'x', idempotencyKey: 'i', correlationId: 'c', auditInfo })
    ).rejects.toThrow('Hold not found');
  });
});
