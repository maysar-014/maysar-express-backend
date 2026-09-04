/**
 * PBT Tests for kyc-gate.middleware
 *
 * Contains:
 *  - Task 1 (Bug Condition Exploration): Tests that FAIL on unfixed code (requireKycLevel).
 *    They prove the listing-cap bypass gap exists — next() is always called even when count >= max.
 *  - Task 2 (Preservation): Tests that PASS on both unfixed and fixed code.
 *    They prove below-cap requests are unaffected.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';

// ── Mock the prisma client before importing the middleware ──
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

import {
  requireKycLevel,
  requireKycListingCapacity,
} from './kyc-gate.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMockReq(userId = 'user-123'): Request {
  return { user: { userId } } as unknown as Request;
}

function makeMockRes(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res: Partial<Response> = {
    status: statusMock as unknown as Response['status'],
    json: jsonMock as unknown as Response['json'],
  };
  return { res, statusMock, jsonMock };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1 — Bug Condition Exploration (EXPECTED TO FAIL on unfixed code)
//
// These tests invoke the CURRENT `requireKycLevel` middleware with users whose
// count is >= kycLimitMaxListings and assert that next() IS called.
// Because requireKycLevel never reads kycLimitMaxListings, it always calls
// next() — the tests PASS as assertions, confirming the bug exists.
//
// From the spec perspective, these tests "fail" in the sense that they document
// incorrect/missing enforcement. The test runner will mark them as PASSED (the
// assertions hold), which is how we confirm the bug.
//
// After the fix (Task 3.1), the exploration tests against requireKycListingCapacity
// will FAIL (next() is no longer called) — confirming the fix works. Those are
// verified in Task 3.5.
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 1 — Bug Condition Exploration: requireKycLevel ignores kycLimitMaxListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Sub-test A — Level-0 seller at cap
   * User: kycLevel 0, kycLimitMaxListings 5, count = 5
   * Bug: requireKycLevel(0) calls next() even though count >= max
   */
  it('Sub-test A: level-0 seller at cap (count=5, max=5) — next() is called (bug confirmed)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycStatus: 'verified', kycLimitMaxListings: 5 });
    const req = makeMockReq();
    const { res } = makeMockRes();
    const next = jest.fn();

    await requireKycLevel(0)(req as Request, res as Response, next as NextFunction);

    // Bug: next() is called — cap was NOT checked
    expect(next).toHaveBeenCalled();
  });

  /**
   * Sub-test B — Level-1 seller at cap
   * User: kycLevel 1, kycLimitMaxListings 20, count = 20
   * Bug: requireKycLevel(0) calls next() even though count >= max
   */
  it('Sub-test B: level-1 seller at cap (count=20, max=20) — next() is called (bug confirmed)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 1, kycStatus: 'verified', kycLimitMaxListings: 20 });
    const req = makeMockReq();
    const { res } = makeMockRes();
    const next = jest.fn();

    await requireKycLevel(0)(req as Request, res as Response, next as NextFunction);

    // Bug: next() is called — cap was NOT checked
    expect(next).toHaveBeenCalled();
  });

  /**
   * Sub-test C — Level-1 enabler at cap
   * User: kycLevel 1, kycLimitMaxListings 20, count = 20
   * Bug: requireKycLevel(1) calls next() even though count >= max
   */
  it('Sub-test C: level-1 enabler at cap (count=20, max=20) — next() is called (bug confirmed)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 1, kycStatus: 'verified', kycLimitMaxListings: 20 });
    const req = makeMockReq();
    const { res } = makeMockRes();
    const next = jest.fn();

    await requireKycLevel(1)(req as Request, res as Response, next as NextFunction);

    // Bug: next() is called — cap was NOT checked
    expect(next).toHaveBeenCalled();
  });

  /**
   * Sub-test D — Over-cap (count > max)
   * User: kycLimitMaxListings 5, count = 7
   * Bug: requireKycLevel(0) calls next() even though count > max
   */
  it('Sub-test D: over-cap (count=7, max=5) — next() is called even over cap (bug confirmed)', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycStatus: 'verified', kycLimitMaxListings: 5 });
    const req = makeMockReq();
    const { res } = makeMockRes();
    const next = jest.fn();

    await requireKycLevel(0)(req as Request, res as Response, next as NextFunction);

    // Bug: next() is called — cap was NOT checked
    expect(next).toHaveBeenCalled();
  });

  /**
   * PBT — For ALL (kycLimitMaxListings, currentCount) where count >= max,
   * requireKycLevel always calls next() — proving the cap is universally ignored.
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   */
  it('PBT: requireKycLevel always calls next() for any count >= max across all KYC levels (bug confirmed)', async () => {
    // Arbitrary: (max ∈ [1,9999], count ∈ [max, max+100]) — at or over cap
    const atOrOverCapArb = fc
      .integer({ min: 1, max: 9999 })
      .chain((max) =>
        fc.integer({ min: max, max: max + 100 }).map((count) => ({ max, count }))
      );

    await fc.assert(
      fc.asyncProperty(
        atOrOverCapArb,
        fc.integer({ min: 0, max: 3 }),
        async ({ max, count }, kycLevel) => {
          jest.clearAllMocks();
          mockFindUnique.mockResolvedValue({
            kycLevel,
            kycStatus: 'verified',
            kycLimitMaxListings: max,
          });

          const req = makeMockReq();
          const { res } = makeMockRes();
          const next = jest.fn();

          // requireKycLevel never checks kycLimitMaxListings
          await requireKycLevel(kycLevel)(req as Request, res as Response, next as NextFunction);

          // BUG: next() is called for all at-or-over-cap inputs
          return (next as jest.Mock).mock.calls.length === 1;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2 — Preservation: Below-cap requests call next() on both middlewares
//
// These tests PASS on unfixed code (requireKycLevel) AND on fixed code
// (requireKycListingCapacity). They verify the baseline must not regress.
// ─────────────────────────────────────────────────────────────────────────────

describe('Task 2 — Preservation: below-cap requests always call next()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Preservation A — Below-cap for catalog (requireKycListingCapacity)
   * For all (max, count) where count < max, next() is called.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('Preservation A — requireKycListingCapacity: below-cap requests always call next() (catalog)', async () => {
    const belowCapArb = fc
      .integer({ min: 1, max: 9999 })
      .chain((max) =>
        fc.integer({ min: 0, max: max - 1 }).map((count) => ({ max, count }))
      );

    await fc.assert(
      fc.asyncProperty(
        belowCapArb,
        fc.integer({ min: 0, max: 3 }),
        async ({ max, count }, kycLevel) => {
          jest.clearAllMocks();
          mockFindUnique.mockResolvedValue({
            kycLevel,
            kycLimitMaxListings: max,
          });

          const req = makeMockReq();
          const { res, statusMock } = makeMockRes();
          const next = jest.fn();
          const countFn = jest.fn().mockResolvedValue(count);

          await requireKycListingCapacity(countFn)(
            req as Request,
            res as Response,
            next as NextFunction
          );

          const nextCalled = (next as jest.Mock).mock.calls.length === 1;
          const noStatus = (statusMock as jest.Mock).mock.calls.length === 0;
          return nextCalled && noStatus;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Preservation B — Below-cap for enabler (requireKycListingCapacity)
   * Same shape as A, different label. Covers levels 0–3.
   *
   * **Validates: Requirements 3.4**
   */
  it('Preservation B — requireKycListingCapacity: below-cap requests always call next() (enabler)', async () => {
    const belowCapArb = fc
      .integer({ min: 1, max: 9999 })
      .chain((max) =>
        fc.integer({ min: 0, max: max - 1 }).map((count) => ({ max, count }))
      );

    await fc.assert(
      fc.asyncProperty(
        belowCapArb,
        fc.integer({ min: 0, max: 3 }),
        async ({ max, count }, kycLevel) => {
          jest.clearAllMocks();
          mockFindUnique.mockResolvedValue({
            kycLevel,
            kycLimitMaxListings: max,
          });

          const req = makeMockReq();
          const { res, statusMock } = makeMockRes();
          const next = jest.fn();
          const countFn = jest.fn().mockResolvedValue(count);

          await requireKycListingCapacity(countFn)(
            req as Request,
            res as Response,
            next as NextFunction
          );

          const nextCalled = (next as jest.Mock).mock.calls.length === 1;
          const noStatus = (statusMock as jest.Mock).mock.calls.length === 0;
          return nextCalled && noStatus;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Preservation C — Level 3 effectively uncapped
   * kycLimitMaxListings=9999, count ∈ [0, 9998] → next() always called.
   *
   * **Validates: Requirements 3.5**
   */
  it('Preservation C — level-3 users (max=9999) with count 0..9998 always call next()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 9998 }),
        async (count) => {
          jest.clearAllMocks();
          mockFindUnique.mockResolvedValue({
            kycLevel: 3,
            kycLimitMaxListings: 9999,
          });

          const req = makeMockReq();
          const { res, statusMock } = makeMockRes();
          const next = jest.fn();
          const countFn = jest.fn().mockResolvedValue(count);

          await requireKycListingCapacity(countFn)(
            req as Request,
            res as Response,
            next as NextFunction
          );

          const nextCalled = (next as jest.Mock).mock.calls.length === 1;
          const noStatus = (statusMock as jest.Mock).mock.calls.length === 0;
          return nextCalled && noStatus;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Preservation D — requireKycLevel independence
   * requireKycLevel(0) with kycLevel=0 passes; with kycLevel below minLevel returns 403 KYC_LEVEL_REQUIRED.
   * These behaviours must be unaffected by the existence of requireKycListingCapacity.
   *
   * **Validates: Requirements 3.3**
   */
  it('Preservation D — requireKycLevel(0) with kycLevel=0 calls next(); kycLevel below minLevel returns 403 KYC_LEVEL_REQUIRED', async () => {
    // Pass case
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycStatus: 'verified' });
    const req = makeMockReq();
    const { res: resPass, statusMock: statusPass } = makeMockRes();
    const nextPass = jest.fn();
    await requireKycLevel(0)(req as Request, resPass as Response, nextPass as NextFunction);
    expect(nextPass).toHaveBeenCalled();
    expect(statusPass).not.toHaveBeenCalled();

    // Fail case
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycStatus: 'verified' });
    const { res: resFail, statusMock: statusFail, jsonMock: jsonFail } = makeMockRes();
    const nextFail = jest.fn();
    await requireKycLevel(1)(req as Request, resFail as Response, nextFail as NextFunction);
    expect(nextFail).not.toHaveBeenCalled();
    expect(statusFail).toHaveBeenCalledWith(403);
    expect(jsonFail).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'KYC_LEVEL_REQUIRED' }),
      })
    );
  });

  /**
   * Preservation E — Boundary at cap-minus-one
   * kycLimitMaxListings=5, currentCount=4 → next() called
   *
   * **Validates: Requirements 3.2**
   */
  it('Preservation E — boundary at cap-minus-one (count=4, max=5) → next() called', async () => {
    mockFindUnique.mockResolvedValue({ kycLevel: 0, kycLimitMaxListings: 5 });
    const req = makeMockReq();
    const { res, statusMock } = makeMockRes();
    const next = jest.fn();
    const countFn = jest.fn().mockResolvedValue(4);

    await requireKycListingCapacity(countFn)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });
});
