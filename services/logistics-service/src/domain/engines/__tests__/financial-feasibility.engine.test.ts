/**
 * FinancialFeasibilityEngine unit tests (MYS-DEL-001 Article 4.6 / Article 30)
 *
 * Coverage:
 *   - Four-party funding reconciliation
 *   - Cost reconciliation
 *   - Platform contribution and margin
 *   - Economic classification (PROFITABLE, BREAK_EVEN, SUBSIDIZED, LOSS_MAKING, UNVERIFIED)
 *   - Pre-subsidy classification preserved
 *   - Approval gate: loss-making without subsidy is blocked
 *   - Approval gate: zero driver payout + zero costs is blocked
 *   - EXPECTED merchant contribution excluded from totalFunding
 *   - CONFIRMED merchant contribution included in totalFunding
 *   - Expired subsidy excluded; valid subsidy included
 *   - Data quality flags drive UNVERIFIED classification
 *   - Undefined margin when totalFunding is zero
 *   - Warnings and blocking reasons accumulated correctly
 */

import { FinancialFeasibilityEngine, FeasibilityInput } from '../financial-feasibility.engine';
import { MerchantContributionEngine } from '../merchant-contribution.engine';
import { SubsidyGovernanceEngine, AuthorizedSubsidy } from '../subsidy-governance.engine';

const feasibility = new FinancialFeasibilityEngine();
const merchantEngine = new MerchantContributionEngine();
const subsidyEngine  = new SubsidyGovernanceEngine();

const NOW = new Date('2026-11-15T09:00:00.000Z');
const FUTURE = new Date('2027-01-01T00:00:00.000Z');
const PAST   = new Date('2026-10-01T00:00:00.000Z');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function goodQuality() {
  return {
    driverCompensationFromRealTariff: true,
    fulfillmentCostFromConfig: true,
    paymentCostFromActualRates: true,
  };
}

function baseInput(overrides: Partial<FeasibilityInput> = {}): FeasibilityInput {
  return {
    funding: {
      customerDeliveryFeeTzs: 3000,
      merchantContribution: null,
      confirmedPartnerContributionTzs: 0,
      subsidyApplication: null,
    },
    costs: {
      driverPayoutTzs: 2000,
      otherFulfillmentExpensesTzs: 0,
      paymentProcessingExpensesTzs: 0,
      codExpensesTzs: 0,
    },
    dataQuality: goodQuality(),
    pricingVersion: 2,
    costModelVersion: 'vehicle-tariff-v1',
    financialAssumptions: [],
    issuedAt: NOW,
    ...overrides,
  };
}

function authorizedSubsidy(overrides: Partial<AuthorizedSubsidy> = {}): AuthorizedSubsidy {
  return {
    authorizationId: 'sub-001',
    fundingSource: 'MAYSAR_PLATFORM',
    purpose: 'COVERAGE_OF_DEFICIT',
    authorizedAmountTzs: 5000,
    authorizedBy: 'ops',
    authorizedAt: new Date('2026-11-01T00:00:00.000Z'),
    expiresAt: FUTURE,
    ...overrides,
  };
}

// ─── Funding reconciliation ───────────────────────────────────────────────────

describe('Funding reconciliation', () => {
  test('customer fee alone → totalFunding = customerDeliveryFee', () => {
    const result = feasibility.compute(baseInput());
    expect(result.customerDeliveryFeeTzs).toBe(3000);
    expect(result.confirmedMerchantContributionTzs).toBe(0);
    expect(result.totalFundingTzs).toBe(3000);
  });

  test('EXPECTED merchant contribution is NOT counted in totalFunding', () => {
    const merchantResult = merchantEngine.compute({
      policy: { merchantId: 'm1', type: 'FLAT_PER_ORDER', amountTzs: 500 },
    });
    // status is EXPECTED, isCountable=false
    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 3000,
        merchantContribution: merchantResult,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: null,
      },
    }));
    expect(result.confirmedMerchantContributionTzs).toBe(0);
    expect(result.merchantExpectedTzs).toBe(500);
    expect(result.totalFundingTzs).toBe(3000); // only customer fee
    expect(result.unverifiedReasons).toContain('MERCHANT_CONTRIBUTION_UNCONFIRMED');
  });

  test('CONFIRMED merchant contribution IS counted in totalFunding', () => {
    const expected = merchantEngine.compute({
      policy: { merchantId: 'm1', type: 'FLAT_PER_ORDER', amountTzs: 500 },
    });
    const confirmed = merchantEngine.confirm(expected);
    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 3000,
        merchantContribution: confirmed,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: null,
      },
    }));
    expect(result.confirmedMerchantContributionTzs).toBe(500);
    expect(result.totalFundingTzs).toBe(3500);
  });

  test('partner contribution is added when confirmed', () => {
    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 3000,
        merchantContribution: null,
        confirmedPartnerContributionTzs: 1000,
        subsidyApplication: null,
      },
    }));
    expect(result.confirmedPartnerContributionTzs).toBe(1000);
    expect(result.totalFundingTzs).toBe(4000);
  });

  test('valid subsidy is counted in totalFunding', () => {
    const sub = authorizedSubsidy({ authorizedAmountTzs: 800 });
    const subsidyResult = subsidyEngine.apply({ authorization: sub, deficitTzs: 800, issuedAt: NOW });
    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 2000,
        merchantContribution: null,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: subsidyResult,
      },
      costs: { driverPayoutTzs: 2800, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.authorizedSubsidyAmountTzs).toBe(800);
    expect(result.totalFundingTzs).toBe(2800);
  });

  test('expired subsidy is NOT counted in totalFunding', () => {
    const sub = authorizedSubsidy({ expiresAt: PAST });
    const subsidyResult = subsidyEngine.apply({ authorization: sub, deficitTzs: 800, issuedAt: NOW });
    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 2000,
        merchantContribution: null,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: subsidyResult,
      },
    }));
    expect(result.authorizedSubsidyAmountTzs).toBe(0);
    expect(result.warnings.some(w => w.includes('invalid'))).toBe(true);
  });
});

// ─── Cost reconciliation ──────────────────────────────────────────────────────

describe('Cost reconciliation', () => {
  test('all cost components are summed into totalVariableCostTzs', () => {
    const result = feasibility.compute(baseInput({
      costs: {
        driverPayoutTzs: 2000,
        otherFulfillmentExpensesTzs: 300,
        paymentProcessingExpensesTzs: 150,
        codExpensesTzs: 500,
      },
    }));
    expect(result.totalVariableCostTzs).toBe(2950);
  });
});

// ─── Platform contribution and margin ────────────────────────────────────────

describe('Platform contribution and margin', () => {
  test('contribution = totalFunding - totalVariableCost', () => {
    const result = feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: 3000, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
      costs:   { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.platformContributionTzs).toBe(1000);
  });

  test('margin = contribution / funding * 100', () => {
    const result = feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: 3000, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
      costs:   { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    // 1000 / 3000 * 100 ≈ 33.33
    expect(result.contributionMarginPct).toBeCloseTo(33.33, 1);
  });

  test('margin is null when totalFunding is zero', () => {
    const result = feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: 0, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
      costs:   { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.contributionMarginPct).toBeNull();
  });
});

// ─── Economic classification ──────────────────────────────────────────────────

describe('Economic classification', () => {
  test('PROFITABLE: positive contribution, good data quality', () => {
    const result = feasibility.compute(baseInput());
    expect(result.classification).toBe('PROFITABLE');
    expect(result.isApproved).toBe(true);
    expect(result.blockingReasons).toHaveLength(0);
  });

  test('BREAK_EVEN: zero contribution', () => {
    const result = feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: 2000, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
      costs:   { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.classification).toBe('BREAK_EVEN');
    expect(result.isApproved).toBe(true);
  });

  test('LOSS_MAKING: negative contribution, no subsidy → blocked', () => {
    const result = feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: 1500, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
      costs:   { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.classification).toBe('LOSS_MAKING');
    expect(result.isApproved).toBe(false);
    expect(result.blockingReasons.some(r => r.includes('Article 50'))).toBe(true);
  });

  test('SUBSIDIZED: negative contribution, valid subsidy covers deficit', () => {
    const deficit = 500;
    const sub = authorizedSubsidy({ authorizedAmountTzs: deficit });
    const subsidyResult = subsidyEngine.apply({ authorization: sub, deficitTzs: deficit, issuedAt: NOW });

    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 1500,
        merchantContribution: null,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: subsidyResult,
      },
      costs: { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.classification).toBe('SUBSIDIZED');
    expect(result.isApproved).toBe(true);
  });

  test('UNVERIFIED: placeholder driver compensation', () => {
    const result = feasibility.compute(baseInput({
      dataQuality: { driverCompensationFromRealTariff: false, fulfillmentCostFromConfig: true, paymentCostFromActualRates: true },
    }));
    expect(result.classification).toBe('UNVERIFIED');
    expect(result.isApproved).toBe(true); // UNVERIFIED is a warning, not a hard block
    expect(result.unverifiedReasons).toContain('DRIVER_COMPENSATION_PLACEHOLDER');
  });

  test('pre-subsidy classification is recorded independently of final classification', () => {
    const deficit = 500;
    const sub = authorizedSubsidy({ authorizedAmountTzs: deficit });
    const subsidyResult = subsidyEngine.apply({ authorization: sub, deficitTzs: deficit, issuedAt: NOW });

    const result = feasibility.compute(baseInput({
      funding: {
        customerDeliveryFeeTzs: 1500,
        merchantContribution: null,
        confirmedPartnerContributionTzs: 0,
        subsidyApplication: subsidyResult,
      },
      costs: { driverPayoutTzs: 2000, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    // Final is SUBSIDIZED (subsidy covers it), pre-subsidy is LOSS_MAKING
    expect(result.classification).toBe('SUBSIDIZED');
    expect(result.preSubsidyClassification).toBe('LOSS_MAKING');
  });
});

// ─── Approval gate ────────────────────────────────────────────────────────────

describe('Approval gate', () => {
  test('zero driver payout AND zero costs → blocked (Article 50 §2)', () => {
    const result = feasibility.compute(baseInput({
      costs: { driverPayoutTzs: 0, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }));
    expect(result.isApproved).toBe(false);
    expect(result.blockingReasons.some(r => r.includes('Article 50 §2'))).toBe(true);
  });

  test('non-zero driver payout is not blocked by Article 50 §2', () => {
    const result = feasibility.compute(baseInput());
    expect(result.blockingReasons.every(r => !r.includes('§2'))).toBe(true);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('Input validation', () => {
  test('throws on negative customerDeliveryFeeTzs', () => {
    expect(() => feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: -1, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
    }))).toThrow('cannot be negative');
  });

  test('throws on negative driverPayoutTzs', () => {
    expect(() => feasibility.compute(baseInput({
      costs: { driverPayoutTzs: -1, otherFulfillmentExpensesTzs: 0, paymentProcessingExpensesTzs: 0, codExpensesTzs: 0 },
    }))).toThrow('cannot be negative');
  });

  test('throws on non-finite customerDeliveryFeeTzs', () => {
    expect(() => feasibility.compute(baseInput({
      funding: { customerDeliveryFeeTzs: Infinity, merchantContribution: null, confirmedPartnerContributionTzs: 0, subsidyApplication: null },
    }))).toThrow('must be finite');
  });
});

// ─── Versioning and assumptions ───────────────────────────────────────────────

describe('Versioning and assumptions on output', () => {
  test('carries pricingVersion and costModelVersion through', () => {
    const result = feasibility.compute(baseInput({
      pricingVersion: 7,
      costModelVersion: 'vtv-99',
    }));
    expect(result.pricingVersion).toBe(7);
    expect(result.costModelVersion).toBe('vtv-99');
  });

  test('financialAssumptions array is preserved', () => {
    const result = feasibility.compute(baseInput({
      financialAssumptions: ['assumption A', 'assumption B'],
    }));
    expect(result.financialAssumptions).toEqual(['assumption A', 'assumption B']);
  });
});
