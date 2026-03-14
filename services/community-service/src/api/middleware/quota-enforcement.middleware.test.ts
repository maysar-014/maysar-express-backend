import { Request, Response } from 'express';
import { QuotaEnforcementMiddleware } from './quota-enforcement.middleware';
import { EngagementQuota } from '../../domain/value-objects/engagement-quota.value-object';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { EngagementPolicy } from '../../domain/policies/engagement-policy';

const makeResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as unknown as Response;
  return res;
};

describe('QuotaEnforcementMiddleware', () => {
  const quotaRepository = {
    findByUserAndType: jest.fn(),
    save: jest.fn()
  };
  const profileRepository = {
    findByUserId: jest.fn()
  };

  const middleware = new QuotaEnforcementMiddleware(
    quotaRepository as never,
    profileRepository as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 in enforce when user is missing', async () => {
    const req = {} as Request;
    const res = makeResponse();
    const next = jest.fn();

    await middleware.enforce('POST')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 in enforce when profile does not exist', async () => {
    const req = { user: { id: 'u1' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockResolvedValue(null);

    await middleware.enforce('POST')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User profile not found' });
  });

  it('attaches existing quota and calls next when allowed', async () => {
    const req = { user: { id: 'u1' } } as unknown as Request & { quota?: EngagementQuota };
    const res = makeResponse();
    const next = jest.fn();
    const quota = EngagementQuota.create('u1', 'POST', { daily: 3, weekly: 12, qualityBonus: 1 });
    profileRepository.findByUserId.mockResolvedValue({ reputationTier: ReputationTier.CONTRIBUTOR });
    quotaRepository.findByUserAndType.mockResolvedValue(quota);

    await middleware.enforce('POST')(req as unknown as Request, res, next);

    expect(req.quota).toBe(quota);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('creates quota when missing and attaches it to request', async () => {
    const req = { user: { id: 'u2' } } as unknown as Request & { quota?: EngagementQuota };
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockResolvedValue({ reputationTier: ReputationTier.EXPERT });
    quotaRepository.findByUserAndType.mockResolvedValue(null);

    await middleware.enforce('CHALLENGE')(req as unknown as Request, res, next);

    expect(req.quota).toBeInstanceOf(EngagementQuota);
    expect(req.quota?.quotaType).toBe('CHALLENGE');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when policy says quota exceeded', async () => {
    const req = { user: { id: 'u3' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    const quota = new EngagementQuota({
      userId: 'u3',
      quotaType: 'ARTICLE',
      dailyRemaining: 0,
      weeklyRemaining: 0,
      dailyLimit: 1,
      weeklyLimit: 5,
      dailyResetAt: new Date(Date.now() + 60_000),
      weeklyResetAt: new Date(Date.now() + 3_600_000),
      qualityBonusEarned: 0
    });
    profileRepository.findByUserId.mockResolvedValue({ reputationTier: ReputationTier.NEWCOMER });
    quotaRepository.findByUserAndType.mockResolvedValue(quota);

    await middleware.enforce('ARTICLE')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Quota exceeded',
        message: expect.any(String),
        resetDaily: quota.dailyResetAt,
        resetWeekly: quota.weeklyResetAt
      })
    );
  });

  it('passes errors to next in enforce', async () => {
    const req = { user: { id: 'u4' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockRejectedValue(new Error('profile-db-error'));

    await middleware.enforce('POST')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns 401 in checkCoolingPeriod when user is missing', async () => {
    const req = {} as Request;
    const res = makeResponse();
    const next = jest.fn();

    await middleware.checkCoolingPeriod('THREAD')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 404 in checkCoolingPeriod when profile is not found', async () => {
    const req = { user: { id: 'u5' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockResolvedValue(null);

    await middleware.checkCoolingPeriod('THREAD')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User profile not found' });
  });

  it('computes cooling period and calls next in checkCoolingPeriod', async () => {
    const req = { user: { id: 'u6' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockResolvedValue({ reputationTier: ReputationTier.MENTOR });
    const periodSpy = jest.spyOn(EngagementPolicy, 'getCoolingPeriodMinutes');

    await middleware.checkCoolingPeriod('POST')(req, res, next);

    expect(periodSpy).toHaveBeenCalledWith(ReputationTier.MENTOR, 'POST');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes errors to next in checkCoolingPeriod', async () => {
    const req = { user: { id: 'u7' } } as unknown as Request;
    const res = makeResponse();
    const next = jest.fn();
    profileRepository.findByUserId.mockRejectedValue(new Error('cooling-profile-error'));

    await middleware.checkCoolingPeriod('POST')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

