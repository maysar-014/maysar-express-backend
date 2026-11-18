/**
 * FinancialFeasibilityEngine (MYS-DEL-001 Article 4.6)
 *
 * The final authority before a delivery quote is authorized. Reconciles ALL
 * revenue sources against ALL cost obligations and produces the structured
 * result mandated by Article 30. No quote may be approved without passing
 * through this engine.
 *
 * Four-party funding model (Article 5.1):
 *   customerDeliveryFeeTzs
 *   + confirmedMerchantContributionTzs   (CONFIRMED only — EXPECTED is excluded)
 *   + confirmedPartnerContributionTzs
 *   + authorizedSubsidyAmountTzs         (valid, non-expired only)
 *   = totalFundingTzs
 *
 * Variable cost model (Article 5.2):
 *   driverPayoutTzs                      (from DriverCompensationEngine)
 *   + otherFulfillmentExpensesTzs        (tolls, handling, line-haul additions)
 *   + paymentProcessingExpensesTzs
 *   + codExpensesTzs
 *   = totalVariableCostTzs
 *
 * Platform result (Article 5.3 / 5.4):
 *   platformContributionTzs = totalFundingTzs - totalVariableCostTzs
 *   contributionMarginPct   = platformContributionTzs / totalFundingTzs × 100
 *
 * Classification (Article 5.5):
 *   PROFITABLE | BREAK_EVEN | SUBSIDIZED | LOSS_MAKING | UNVERIFIED
 *
 * Hard constraints (Article 50):
 *   - A quote must not be approved when driverPayoutTzs = 0 and there is
 *     no documented reason (treats delivery as profitable by omission).
 *   - A price ceiling must not silently create an unfunded delivery.
 *   - Placeholder compensation rates trigger UNVERIFIED classification.
 *
 * Pure and stateless: no I/O, no async, no side effects. Deterministic.
 */

import {
  DeliveryEconomicClassification,
  UnverifiedReason,
  classifyDelivery,
} from './economic-classification';
import { MerchantContributionResult } from './merchant-contribution.engine';
import { SubsidyApplicationResult } from './subsidy-governance.engine';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface FeasibilityFundingSources {
  /** Buyer-facing delivery fee (after floor/ceiling/rounding). Required. */
  customerDeliveryFeeTzs: number;
  /**
   * Merchant contribution result from MerchantContributionEngine.
   * Only contributions with status=CONFIRMED contribute to totalFunding.
   * EXPECTED contributions are recorded but NOT counted.
   */
  merchantContribution: MerchantContributionResult | null;
  /**
   * Partner contribution in TZS (confirmed by commercial team).
   * Zero when no partner arrangement exists.
   */
  confirmedPartnerContributionTzs: number;
  /**
   * Subsidy application result from SubsidyGovernanceEngine.
   * Only valid, non-expired subsidies contribute to totalFunding.
   */
  subsidyApplication: SubsidyApplicationResult | null;
}

export interface FeasibilityCostComponents {
  /** Driver gross payout from DriverCompensationEngine. Must never be zero
   *  without an explicit reason code — zero driver payout is an integrity flag. */
  driverPayoutTzs: number;
  /** Additional fulfillment costs not captured in driver payout (tolls, handling, etc.). */
  otherFulfillmentExpensesTzs: number;
  /** Payment processing fees (mobile money, card, bank transfer rates). */
  paymentProcessingExpensesTzs: number;
  /** COD collection and reconciliation costs. */
  codExpensesTzs: number;
}

export interface FeasibilityInput {
  funding: FeasibilityFundingSources;
  costs: FeasibilityCostComponents;
  /**
   * Data quality flags — the engine uses these to determine whether the
   * result is reliable enough to classify as PROFITABLE or must be UNVERIFIED.
   */
  dataQuality: {
    /** True when driverCompensation was computed from real VehicleTariff data.
     *  False when CourierCostCalculator placeholder rates were used. */
    driverCompensationFromRealTariff: boolean;
    /** True when fulfillment cost was computed from real distance-band config.
     *  False when assumed/estimated. */
    fulfillmentCostFromConfig: boolean;
    /** True when payment processing cost is based on actual provider rates.
     *  False when assumed. */
    paymentCostFromActualRates: boolean;
  };
  /** Pricing and cost-model version identifiers for the audit snapshot. */
  pricingVersion: number;
  costModelVersion: string;
  /** Financial assumptions that must be recorded on the snapshot for reproducibility. */
  financialAssumptions: string[];
  /** Quote issue timestamp (used for subsidy expiry validation). */
  issuedAt: Date;
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface FeasibilityResult {
  // ── Funding breakdown ────────────────────────────────────────────────────
  customerDeliveryFeeTzs: number;
  /** Confirmed merchant contribution only. EXPECTED is in merchantExpectedTzs. */
  confirmedMerchantContributionTzs: number;
  /** Expected but unconfirmed merchant contribution (for dashboard visibility). */
  merchantExpectedTzs: number;
  confirmedPartnerContributionTzs: number;
  authorizedSubsidyAmountTzs: number;
  totalFundingTzs: number;

  // ── Cost breakdown ───────────────────────────────────────────────────────
  driverPayoutTzs: number;
  otherFulfillmentExpensesTzs: number;
  paymentProcessingExpensesTzs: number;
  codExpensesTzs: number;
  totalVariableCostTzs: number;

  // ── Platform result ──────────────────────────────────────────────────────
  platformContributionTzs: number;
  /** Percentage: platformContribution / totalFunding × 100. Undefined when funding is zero. */
  contributionMarginPct: number | null;

  // ── Classification ───────────────────────────────────────────────────────
  classification: DeliveryEconomicClassification;
  /** Pre-subsidy classification — recorded so subsidization never hides the cost structure. */
  preSubsidyClassification: DeliveryEconomicClassification;
  unverifiedReasons: UnverifiedReason[];

  // ── Approval gate ────────────────────────────────────────────────────────
  /**
   * True when this delivery may proceed to quote issuance.
   * False when a critical constraint is violated (Article 50).
   * UNVERIFIED quotes are approved with a warning, not blocked —
   * they cannot be reported as profitable.
   */
  isApproved: boolean;
  /** Non-empty when isApproved is false. */
  blockingReasons: string[];
  /** Non-fatal warnings that must appear in audit and monitoring. */
  warnings: string[];

  // ── Versioning & audit ───────────────────────────────────────────────────
  pricingVersion: number;
  costModelVersion: string;
  financialAssumptions: string[];

  // ── Subsidy detail ───────────────────────────────────────────────────────
  subsidyDetail: SubsidyApplicationResult | null;
  merchantContributionDetail: MerchantContributionResult | null;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class FinancialFeasibilityEngine {

  compute(input: FeasibilityInput): FeasibilityResult {
    this.validateInput(input);

    const { funding, costs, dataQuality } = input;
    const warnings: string[] = [];
    const blockingReasons: string[] = [];
    const unverifiedReasons: UnverifiedReason[] = [];

    // ── Funding reconciliation ────────────────────────────────────────────

    const customerDeliveryFeeTzs = round(funding.customerDeliveryFeeTzs);

    // Merchant: only CONFIRMED counts toward total funding (Article 4.4).
    const confirmedMerchantContributionTzs =
      funding.merchantContribution?.isCountable
        ? round(funding.merchantContribution.expectedContributionTzs)
        : 0;
    const merchantExpectedTzs = funding.merchantContribution
      ? round(funding.merchantContribution.expectedContributionTzs)
      : 0;

    if (
      funding.merchantContribution?.status === 'EXPECTED' &&
      merchantExpectedTzs > 0
    ) {
      unverifiedReasons.push('MERCHANT_CONTRIBUTION_UNCONFIRMED');
      warnings.push(
        `Merchant contribution of TZS ${merchantExpectedTzs} is EXPECTED but not yet confirmed. `
        + `It is excluded from total funding per Article 4.4.`,
      );
    }

    const confirmedPartnerContributionTzs = round(funding.confirmedPartnerContributionTzs);

    // Subsidy: only valid (non-expired) subsidies count.
    let authorizedSubsidyAmountTzs = 0;
    if (funding.subsidyApplication) {
      if (!funding.subsidyApplication.isValid) {
        warnings.push(
          `Subsidy authorization ${funding.subsidyApplication.authorizationId} is invalid: `
          + (funding.subsidyApplication.invalidReason ?? 'unknown reason'),
        );
        unverifiedReasons.push('SUBSIDY_AUTHORIZATION_MISSING');
      } else {
        authorizedSubsidyAmountTzs = round(funding.subsidyApplication.appliedAmountTzs);
      }
    }

    const totalFundingTzs = round(
      customerDeliveryFeeTzs
      + confirmedMerchantContributionTzs
      + confirmedPartnerContributionTzs
      + authorizedSubsidyAmountTzs,
    );

    // ── Cost reconciliation ───────────────────────────────────────────────

    const driverPayoutTzs                 = round(costs.driverPayoutTzs);
    const otherFulfillmentExpensesTzs     = round(costs.otherFulfillmentExpensesTzs);
    const paymentProcessingExpensesTzs    = round(costs.paymentProcessingExpensesTzs);
    const codExpensesTzs                  = round(costs.codExpensesTzs);

    const totalVariableCostTzs = round(
      driverPayoutTzs
      + otherFulfillmentExpensesTzs
      + paymentProcessingExpensesTzs
      + codExpensesTzs,
    );

    // ── Data quality checks ───────────────────────────────────────────────

    if (!dataQuality.driverCompensationFromRealTariff) {
      unverifiedReasons.push('DRIVER_COMPENSATION_PLACEHOLDER');
      warnings.push(
        'Driver compensation was computed using placeholder (CourierCostCalculator mock) rates, '
        + 'not a real VehicleTariff. Result cannot be classified as PROFITABLE.',
      );
    }

    if (!dataQuality.fulfillmentCostFromConfig) {
      unverifiedReasons.push('FULFILLMENT_COST_ESTIMATED');
      warnings.push('Fulfillment cost is based on an estimate, not a configured distance-band or corridor.');
    }

    if (!dataQuality.paymentCostFromActualRates) {
      unverifiedReasons.push('PAYMENT_COST_UNKNOWN');
      warnings.push('Payment processing cost is assumed/estimated. Actual provider rates not applied.');
    }

    // Zero driver payout with no documented reason is a hard integrity violation.
    if (driverPayoutTzs === 0 && totalVariableCostTzs === 0) {
      blockingReasons.push(
        'Article 50 §2: Driver payout is zero and no fulfillment costs are recorded. '
        + 'This delivery cannot be classified as profitable by omission of cost data.',
      );
    }

    // ── Platform contribution ─────────────────────────────────────────────

    const platformContributionTzs = round(totalFundingTzs - totalVariableCostTzs);
    const contributionMarginPct =
      totalFundingTzs > 0
        ? round((platformContributionTzs / totalFundingTzs) * 100)
        : null;

    // ── Classification (pre-subsidy, then with subsidy) ───────────────────

    // Pre-subsidy: use funding WITHOUT the subsidy amount to show underlying economics.
    const preTotalFunding = round(
      customerDeliveryFeeTzs + confirmedMerchantContributionTzs + confirmedPartnerContributionTzs,
    );
    const preContribution = round(preTotalFunding - totalVariableCostTzs);

    const preSubsidyClassification = classifyDelivery({
      platformContribution: preContribution,
      hasAuthorizedSubsidy: false,
      subsidyCoversDeficit: false,
      unverifiedReasons,
    });

    const hasAuthorizedSubsidy = authorizedSubsidyAmountTzs > 0
      && (funding.subsidyApplication?.isValid ?? false);
    const subsidyCoversDeficit =
      hasAuthorizedSubsidy && (funding.subsidyApplication?.coversDeficit ?? false);

    const classification = classifyDelivery({
      platformContribution: platformContributionTzs,
      hasAuthorizedSubsidy,
      subsidyCoversDeficit,
      unverifiedReasons,
      preSubsidyContribution: preContribution,
    });

    // ── Approval gate ─────────────────────────────────────────────────────

    // Price ceiling silently creating an unfunded delivery (Article 9, Article 50 §3).
    if (platformContributionTzs < 0 && !hasAuthorizedSubsidy) {
      blockingReasons.push(
        `Article 50 §3: Delivery is loss-making (contribution: TZS ${platformContributionTzs}) `
        + 'and no authorized subsidy covers the deficit. '
        + 'A price ceiling must not create an unfunded delivery.',
      );
    }

    // Partial subsidy coverage must generate a warning but is not blocking
    // (the platform absorbs the residual, which is a documented risk).
    if (hasAuthorizedSubsidy && !subsidyCoversDeficit && platformContributionTzs < 0) {
      warnings.push(
        `Subsidy only partially covers the deficit. `
        + `Residual loss: TZS ${Math.abs(platformContributionTzs)}. `
        + `Platform absorbs this amount per risk acceptance policy.`,
      );
    }

    const isApproved = blockingReasons.length === 0;

    return {
      customerDeliveryFeeTzs,
      confirmedMerchantContributionTzs,
      merchantExpectedTzs,
      confirmedPartnerContributionTzs,
      authorizedSubsidyAmountTzs,
      totalFundingTzs,
      driverPayoutTzs,
      otherFulfillmentExpensesTzs,
      paymentProcessingExpensesTzs,
      codExpensesTzs,
      totalVariableCostTzs,
      platformContributionTzs,
      contributionMarginPct,
      classification,
      preSubsidyClassification,
      unverifiedReasons,
      isApproved,
      blockingReasons,
      warnings,
      pricingVersion: input.pricingVersion,
      costModelVersion: input.costModelVersion,
      financialAssumptions: [...input.financialAssumptions],
      subsidyDetail: funding.subsidyApplication ?? null,
      merchantContributionDetail: funding.merchantContribution ?? null,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private validateInput(input: FeasibilityInput): void {
    const f = input.funding;
    const c = input.costs;

    if (!(f.customerDeliveryFeeTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: customerDeliveryFeeTzs cannot be negative');
    }
    if (!(f.confirmedPartnerContributionTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: confirmedPartnerContributionTzs cannot be negative');
    }
    if (!(c.driverPayoutTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: driverPayoutTzs cannot be negative');
    }
    if (!(c.otherFulfillmentExpensesTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: otherFulfillmentExpensesTzs cannot be negative');
    }
    if (!(c.paymentProcessingExpensesTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: paymentProcessingExpensesTzs cannot be negative');
    }
    if (!(c.codExpensesTzs >= 0)) {
      throw new Error('FinancialFeasibilityEngine: codExpensesTzs cannot be negative');
    }
    if (!Number.isFinite(f.customerDeliveryFeeTzs)) {
      throw new Error('FinancialFeasibilityEngine: customerDeliveryFeeTzs must be finite');
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
