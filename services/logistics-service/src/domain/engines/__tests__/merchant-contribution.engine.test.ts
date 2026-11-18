/**
 * MerchantContributionEngine unit tests (MYS-DEL-001 Article 4.4)
 */

import {
  MerchantContributionEngine,
  MerchantContributionPolicy,
} from '../merchant-contribution.engine';

const engine = new MerchantContributionEngine();

function policy(overrides: Partial<MerchantContributionPolicy>): MerchantContributionPolicy {
  return {
    merchantId: 'merch-001',
    type: 'NONE',
    agreementRef: 'AGR-001',
    ...overrides,
  };
}

// ─── NONE / ABSENT ────────────────────────────────────────────────────────────

describe('NONE type', () => {
  test('returns zero contribution and ABSENT status', () => {
    const result = engine.compute({ policy: policy({ type: 'NONE' }) });
    expect(result.expectedContributionTzs).toBe(0);
    expect(result.status).toBe('ABSENT');
    expect(result.isCountable).toBe(false);
  });
});

// ─── FLAT_PER_ORDER ───────────────────────────────────────────────────────────

describe('FLAT_PER_ORDER type', () => {
  test('returns exact flat amount with EXPECTED status', () => {
    const result = engine.compute({
      policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: 1000 }),
    });
    expect(result.expectedContributionTzs).toBe(1000);
    expect(result.status).toBe('EXPECTED');
    expect(result.isCountable).toBe(false); // not confirmed yet
  });

  test('flat amount zero is valid', () => {
    const result = engine.compute({ policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: 0 }) });
    expect(result.expectedContributionTzs).toBe(0);
  });

  test('negative flat amount throws', () => {
    expect(() => engine.compute({ policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: -100 }) }))
      .toThrow();
  });
});

// ─── PERCENTAGE_OF_ORDER ──────────────────────────────────────────────────────

describe('PERCENTAGE_OF_ORDER type', () => {
  test('computes 10% of order subtotal correctly', () => {
    const result = engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_ORDER', rate: 0.10 }),
      orderSubtotalTzs: 50000,
    });
    expect(result.expectedContributionTzs).toBe(5000);
    expect(result.status).toBe('EXPECTED');
  });

  test('rounds to 2 decimal places', () => {
    const result = engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_ORDER', rate: 0.07 }),
      orderSubtotalTzs: 1001,
    });
    // 1001 * 0.07 = 70.07 → 70.07
    expect(result.expectedContributionTzs).toBe(70.07);
  });

  test('throws when orderSubtotalTzs is missing', () => {
    expect(() => engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_ORDER', rate: 0.10 }),
    })).toThrow();
  });

  test('throws when rate is out of [0, 1]', () => {
    expect(() => engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_ORDER', rate: 1.5 }),
      orderSubtotalTzs: 50000,
    })).toThrow();
  });
});

// ─── PERCENTAGE_OF_FEE ────────────────────────────────────────────────────────

describe('PERCENTAGE_OF_FEE type', () => {
  test('computes 50% of delivery fee', () => {
    const result = engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_FEE', rate: 0.50 }),
      customerDeliveryFeeTzs: 3000,
    });
    expect(result.expectedContributionTzs).toBe(1500);
  });

  test('throws when customerDeliveryFeeTzs is missing', () => {
    expect(() => engine.compute({
      policy: policy({ type: 'PERCENTAGE_OF_FEE', rate: 0.50 }),
    })).toThrow();
  });
});

// ─── CAPPED_PERCENTAGE ────────────────────────────────────────────────────────

describe('CAPPED_PERCENTAGE type', () => {
  test('applies cap when computed amount exceeds cap', () => {
    const result = engine.compute({
      policy: policy({ type: 'CAPPED_PERCENTAGE', rate: 0.20, amountTzs: 500 }),
      orderSubtotalTzs: 10000, // 20% = 2000, capped at 500
    });
    expect(result.expectedContributionTzs).toBe(500);
    expect(result.calculationNote).toContain('capped');
  });

  test('does not apply cap when computed amount is under cap', () => {
    const result = engine.compute({
      policy: policy({ type: 'CAPPED_PERCENTAGE', rate: 0.05, amountTzs: 2000 }),
      orderSubtotalTzs: 10000, // 5% = 500, under cap
    });
    expect(result.expectedContributionTzs).toBe(500);
    expect(result.calculationNote).not.toContain('capped');
  });
});

// ─── Confirm and waive ────────────────────────────────────────────────────────

describe('confirm()', () => {
  test('transitions EXPECTED to CONFIRMED and sets isCountable=true', () => {
    const expected = engine.compute({
      policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: 800 }),
    });
    expect(expected.isCountable).toBe(false);

    const confirmed = engine.confirm(expected);
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.isCountable).toBe(true);
    expect(confirmed.expectedContributionTzs).toBe(800); // amount unchanged
  });

  test('throws when attempting to confirm an ABSENT result', () => {
    const absent = engine.compute({ policy: policy({ type: 'NONE' }) });
    expect(() => engine.confirm(absent)).toThrow();
  });
});

describe('waive()', () => {
  test('transitions to WAIVED, preserves amount, sets isCountable=false', () => {
    const expected = engine.compute({
      policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: 800 }),
    });
    const waived = engine.waive(expected, 'promotional exception');
    expect(waived.status).toBe('WAIVED');
    expect(waived.isCountable).toBe(false);
    expect(waived.expectedContributionTzs).toBe(800);
    expect(waived.calculationNote).toContain('promotional exception');
  });
});

// ─── Agreement reference ──────────────────────────────────────────────────────

describe('agreement reference', () => {
  test('carries agreementRef from policy', () => {
    const result = engine.compute({
      policy: policy({ type: 'FLAT_PER_ORDER', amountTzs: 500, agreementRef: 'CONTRACT-42' }),
    });
    expect(result.agreementRef).toBe('CONTRACT-42');
  });

  test('agreementRef is null when not provided', () => {
    const p: MerchantContributionPolicy = { merchantId: 'merch-001', type: 'NONE' };
    const result = engine.compute({ policy: p });
    expect(result.agreementRef).toBeNull();
  });
});
