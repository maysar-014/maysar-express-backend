/**
 * DeliveryEconomicClassification (MYS-DEL-001 Article 5.5)
 *
 * Every delivery must carry one of these five classifications. The classification
 * is determined by the FinancialFeasibilityEngine — no other code may assign it.
 *
 * Rules:
 *   PROFITABLE     — platformContribution > 0 AND all funding sources are verified.
 *   BREAK_EVEN     — platformContribution === 0 AND all funding sources are verified.
 *   SUBSIDIZED     — platformContribution < 0 but an explicitly authorized subsidy
 *                    covers the deficit. The underlying pre-subsidy result is also
 *                    recorded — subsidization must not conceal the cost structure.
 *   LOSS_MAKING    — platformContribution < 0 and no authorized subsidy covers it,
 *                    OR the subsidy exists but is insufficient.
 *   UNVERIFIED     — At least one required cost or funding input is absent, estimated
 *                    without evidence, or below the minimum confidence threshold.
 *                    A quote may still be issued as UNVERIFIED during the data-gap
 *                    phase, but it must be flagged and must NOT be reported as profitable.
 */

export type DeliveryEconomicClassification =
  | 'PROFITABLE'
  | 'BREAK_EVEN'
  | 'SUBSIDIZED'
  | 'LOSS_MAKING'
  | 'UNVERIFIED';

/**
 * Reasons a delivery may be classified UNVERIFIED.
 * Multiple reasons may apply; all are recorded.
 */
export type UnverifiedReason =
  | 'DRIVER_COMPENSATION_PLACEHOLDER'   // CourierCostCalculator mock rates in use
  | 'MERCHANT_CONTRIBUTION_UNCONFIRMED' // expected contribution not yet verified
  | 'FULFILLMENT_COST_ESTIMATED'        // cost assumed, no tariff-backed calculation
  | 'SUBSIDY_AUTHORIZATION_MISSING'     // subsidy field set but no approved record
  | 'PAYMENT_COST_UNKNOWN'              // COD or payment processing cost not calculated
  | 'INCOMPLETE_FUNDING_DATA';          // one or more funding sources could not be determined

export function classifyDelivery(params: {
  platformContribution: number;
  hasAuthorizedSubsidy: boolean;
  subsidyCoversDeficit: boolean;
  unverifiedReasons: UnverifiedReason[];
  /** Pre-subsidy platform contribution — required to detect when a subsidy
   *  converted a loss into break-even or profit. If not provided, falls back
   *  to platformContribution (backward-compatible). */
  preSubsidyContribution?: number;
}): DeliveryEconomicClassification {
  if (params.unverifiedReasons.length > 0) return 'UNVERIFIED';

  // A delivery is SUBSIDIZED when a subsidy was needed and authorized —
  // regardless of whether the final post-subsidy contribution is now zero or positive.
  // We detect this by checking whether the pre-subsidy contribution was negative.
  const preSubsidy = params.preSubsidyContribution ?? params.platformContribution;
  if (params.hasAuthorizedSubsidy && preSubsidy < 0 && params.subsidyCoversDeficit) {
    return 'SUBSIDIZED';
  }

  if (params.platformContribution > 0)   return 'PROFITABLE';
  if (params.platformContribution === 0) return 'BREAK_EVEN';

  // platformContribution < 0
  if (params.hasAuthorizedSubsidy && params.subsidyCoversDeficit) return 'SUBSIDIZED';
  return 'LOSS_MAKING';
}
