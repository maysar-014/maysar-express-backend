/**
 * Unit tests for kyc-gate middleware
 *
 * Covers:
 *  - requireKycListingCapacity: all specified deterministic cases
 *  - requireKycLevel: regression check — existing behaviour unchanged
 */

import { Request, Response, NextFunction } from 'express';

// ── Mock prisma before importing middleware ──
const mockFindUnique = jest.fn();
jest.mock(
  '../../infrastructure/database/prisma-client',
  () => ({
    prisma: {
      user_User: {
        findUnique: (...args: unknown[]) => mockFindUnique(...args),
      },
    },
  })
);

import { requireKycListingCapacity, requireKycLevel } from './kyc-gate.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReq(userId?: string): Request {
  return { user: userId ? { userId } : undefined } as unknown as Request;
}

function makeRes(): {
  res: Response;
  statusMock: jest.Mock;
  jsonMock: jest.Mock;
} {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res = {
    status: statusMock,
    json: jsonMock,
  } as unknown as Response;
  return { res, statusMock, jsonMock };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireKycListingCapacity
// ─────────────────────────────────────────────────────────────────────────────

describe('requireKycListingCapacity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTTP 401 UNAUTHORIZED when no userId in request', async () => {
    const req = makeReq(); // no userId
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();

    await requireKycListingCapacity(jest.fn())(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns HTTP 403 KYC_LISTING_CAP_REACHED when count >= maxAllowed', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycLimitMaxListings: 5 });
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(5);

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = jsonMock.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('KYC_LISTING_CAP_REACHED');
    expect(body.error.currentCount).toBe(5);
    expect(body.error.maxAllowed).toBe(5);
    expect(body.error.currentLevel).toBe(0);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when count < maxAllowed', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycLimitMaxListings: 5 });
    const req = makeReq('user-abc');
    const { res, statusMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(3);

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('calls next() when count === maxAllowed - 1 (boundary below cap)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycLimitMaxListings: 5 });
    const req = makeReq('user-abc');
    const { res, statusMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(4); // maxAllowed - 1

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns HTTP 403 when count === maxAllowed (boundary at cap)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 1, kycLimitMaxListings: 20 });
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(20); // exactly at cap

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = jsonMock.mock.calls[0][0];
    expect(body.error.code).toBe('KYC_LISTING_CAP_REACHED');
    expect(body.error.currentCount).toBe(20);
    expect(body.error.maxAllowed).toBe(20);
    expect(next).not.toHaveBeenCalled();
  });

  it('defaults kycLimitMaxListings to 5 when user not found; count=5 → HTTP 403', async () => {
    mockFindUnique.mockResolvedValue(null); // user not found
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(5);

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = jsonMock.mock.calls[0][0];
    expect(body.error.code).toBe('KYC_LISTING_CAP_REACHED');
    expect(body.error.maxAllowed).toBe(5); // default
    expect(body.error.currentCount).toBe(5);
    expect(body.error.currentLevel).toBe(0); // default
    expect(next).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 KYC_GATE_ERROR when countFn throws', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycLimitMaxListings: 5 });
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockRejectedValue(new Error('DB connection failed'));

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(500);
    const body = jsonMock.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('KYC_GATE_ERROR');
    expect(body.error.message).toBe('DB connection failed');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for level-3 user (kycLimitMaxListings=9999) with count=9998', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 3, kycLimitMaxListings: 9999 });
    const req = makeReq('user-abc');
    const { res, statusMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(9998);

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 KYC_GATE_ERROR when findUnique throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('Prisma error'));
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(0);

    await requireKycListingCapacity(countFn)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock.mock.calls[0][0].error.code).toBe('KYC_GATE_ERROR');
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireKycLevel regression tests — behaviour must be unchanged
// ─────────────────────────────────────────────────────────────────────────────

describe('requireKycLevel (regression — existing behaviour unchanged)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next() when kycLevel >= minLevel', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 1, kycStatus: 'verified' });
    const req = makeReq('user-abc');
    const { res, statusMock } = makeRes();
    const next = jest.fn();

    await requireKycLevel(1)(req, res, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns HTTP 403 KYC_LEVEL_REQUIRED when kycLevel < minLevel', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycStatus: 'verified' });
    const req = makeReq('user-abc');
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();

    await requireKycLevel(1)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(403);
    const body = jsonMock.mock.calls[0][0];
    expect(body.error.code).toBe('KYC_LEVEL_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns HTTP 401 UNAUTHORIZED when no userId in request', async () => {
    const req = makeReq();
    const { res, statusMock, jsonMock } = makeRes();
    const next = jest.fn();

    await requireKycLevel(0)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock.mock.calls[0][0].error.code).toBe('UNAUTHORIZED');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns HTTP 500 KYC_GATE_ERROR when findUnique throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB error'));
    const req = makeReq('user-abc');
    const { res, statusMock } = makeRes();
    const next = jest.fn();

    await requireKycLevel(0)(req, res, next as NextFunction);

    expect(statusMock).toHaveBeenCalledWith(500);
  });
});
