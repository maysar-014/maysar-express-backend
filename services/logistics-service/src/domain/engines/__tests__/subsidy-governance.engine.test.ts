/**
 * SubsidyGovernanceEngine unit tests (MYS-DEL-001 Article 4.5)
 */

import {
  SubsidyGovernanceEngine,
  AuthorizedSubsidy,
} from '../subsidy-governance.engine';

const engine = new SubsidyGovernanceEngine();

const BASE_DATE = new Date('2026-11-01T10:00:00.000Z');
const FUTURE    = new Date('2026-12-31T23:59:00.000Z');
const PAST      = new Date('2026-10-01T00:00:00.000Z');

function auth(overrides: Partial<AuthorizedSubsidy> = {}): AuthorizedSubsidy {
  return {
    authorizationId: 'sub-001',
    fundingSource: 'MAYSAR_PLATFORM',
    purpose: 'FREE_DELIVERY_PROMOTION',
    authorizedAmountTzs: 2000,
    authorizedBy: 'ops-admin',
    authorizedAt: new Date('2026-11-01T00:00:00.000Z'),
    expiresAt: FUTURE,
    ...overrides,
  };
}

// ─── apply() — valid cases ────────────────────────────────────────────────────

describe('apply() — valid subsidy', () => {
  test('applies full authorized amount when deficit <= authorized', () => {
    const result = engine.apply({ authorization: auth(), deficitTzs: 1000, issuedAt: BASE_DATE });
    expect(result.isValid).toBe(true);
    expect(result.appliedAmountTzs).toBe(1000);
    expect(result.coversDeficit).toBe(true);
    expect(result.invalidReason).toBeNull();
  });

  test('caps at authorized amount when deficit > authorized', () => {
    const result = engine.apply({ authorization: auth({ authorizedAmountTzs: 500 }), deficitTzs: 1500, issuedAt: BASE_DATE });
    expect(result.isValid).toBe(true);
    expect(result.appliedAmountTzs).toBe(500);
    expect(result.coversDeficit).toBe(false);
    expect(result.calculationNote).toContain('Partial coverage');
  });

  test('zero deficit results in zero applied amount with coversDeficit=true', () => {
    const result = engine.apply({ authorization: auth(), deficitTzs: 0, issuedAt: BASE_DATE });
    expect(result.appliedAmountTzs).toBe(0);
    expect(result.coversDeficit).toBe(true);
  });

  test('carries authorizationId, fundingSource, purpose from authorization', () => {
    const a = auth({ authorizationId: 'sub-XYZ', fundingSource: 'MERCHANT_PROMOTION', purpose: 'DISCOUNTED_DELIVERY' });
    const result = engine.apply({ authorization: a, deficitTzs: 100, issuedAt: BASE_DATE });
    expect(result.authorizationId).toBe('sub-XYZ');
    expect(result.fundingSource).toBe('MERCHANT_PROMOTION');
    expect(result.purpose).toBe('DISCOUNTED_DELIVERY');
  });

  test('no-expiry subsidy (expiresAt: null) is always valid', () => {
    const result = engine.apply({ authorization: auth({ expiresAt: null }), deficitTzs: 500, issuedAt: BASE_DATE });
    expect(result.isValid).toBe(true);
    expect(result.appliedAmountTzs).toBe(500);
  });
});

// ─── apply() — expired ────────────────────────────────────────────────────────

describe('apply() — expired authorization', () => {
  test('returns isValid=false when issuedAt is after expiresAt', () => {
    const result = engine.apply({
      authorization: auth({ expiresAt: PAST }),
      deficitTzs: 500,
      issuedAt: BASE_DATE, // BASE_DATE > PAST
    });
    expect(result.isValid).toBe(false);
    expect(result.appliedAmountTzs).toBe(0);
    expect(result.coversDeficit).toBe(false);
    expect(result.invalidReason).toContain('expired');
  });
});

// ─── apply() — invalid amount ─────────────────────────────────────────────────

describe('apply() — invalid authorized amount', () => {
  test('returns isValid=false when authorizedAmountTzs < 0', () => {
    const result = engine.apply({
      authorization: auth({ authorizedAmountTzs: -100 }),
      deficitTzs: 500,
      issuedAt: BASE_DATE,
    });
    expect(result.isValid).toBe(false);
    expect(result.appliedAmountTzs).toBe(0);
  });
});

// ─── apply() — input guard ────────────────────────────────────────────────────

describe('apply() — input guard', () => {
  test('throws when deficitTzs < 0', () => {
    expect(() => engine.apply({ authorization: auth(), deficitTzs: -1, issuedAt: BASE_DATE })).toThrow();
  });
});

// ─── isValid() ────────────────────────────────────────────────────────────────

describe('isValid()', () => {
  test('true for non-expired, positive-amount authorization', () => {
    expect(engine.isValid(auth(), BASE_DATE)).toBe(true);
  });

  test('false for expired authorization', () => {
    expect(engine.isValid(auth({ expiresAt: PAST }), BASE_DATE)).toBe(false);
  });

  test('false for negative authorized amount', () => {
    expect(engine.isValid(auth({ authorizedAmountTzs: -1 }), BASE_DATE)).toBe(false);
  });

  test('true for null expiresAt', () => {
    expect(engine.isValid(auth({ expiresAt: null }), BASE_DATE)).toBe(true);
  });
});
