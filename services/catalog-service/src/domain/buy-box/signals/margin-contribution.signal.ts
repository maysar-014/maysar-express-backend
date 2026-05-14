/**
 * Margin Contribution Signal Computer
 * Requirement 9: platform net margin signal with NEGATIVE_MARGIN penalty and HIGH_MARGIN bonus.
 */

export interface MarginContributionParams {
  /** Seller's commission tier as a fraction (e.g. 0.08 = 8%). */
  commissionTier: number;
  /** Estimated logistics cost in TZS for the delivery zone. */
  logisticsCost: number;
  /** Expected COD failure cost in TZS (0 when payment is not COD). */
  codFailureCost: number;
  /** Seller's offer price in TZS. */
  offerPrice: number;
  /**
   * Net margin values of all other offers for the same product.
   * Used to determine top-quartile bonus. Optional.
   */
  allOfferMargins?: number[];
}

export interface MarginContributionResult {
  /** Neutral base (50) adjusted by margin signals. */
  score: number;
  /** NEGATIVE_MARGIN penalty (0 or −15). */
  penalty: number;
  /** HIGH_MARGIN bonus (0 or +5). */
  bonus: number;
  /** Total adjustment clamped to [−15, +15]. */
  adjustment: number;
  /** Estimated net margin in TZS. */
  estimatedNetMargin: number;
}

/**
 * Compute the Margin Contribution result.
 *
 * - Estimated net margin = offerPrice × commissionTier − logisticsCost − codFailureCost
 * - Negative margin → NEGATIVE_MARGIN penalty −15
 * - Top-quartile margin among all offers → HIGH_MARGIN bonus +5
 * - Total adjustment capped at ±15
 */
export function computeMarginContribution(
  params: MarginContributionParams
): MarginContributionResult {
  const { commissionTier, logisticsCost, codFailureCost, offerPrice, allOfferMargins } =
    params;

  const estimatedNetMargin =
    offerPrice * commissionTier - logisticsCost - codFailureCost;

  let penalty = 0;
  let bonus = 0;

  if (estimatedNetMargin < 0) {
    penalty = -15; // NEGATIVE_MARGIN
  }

  if (allOfferMargins && allOfferMargins.length > 0) {
    const sorted = [...allOfferMargins].sort((a, b) => a - b);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q3Threshold = sorted[q3Index] ?? sorted[sorted.length - 1];
    if (estimatedNetMargin >= q3Threshold) {
      bonus = 5; // HIGH_MARGIN
    }
  }

  const adjustment = Math.max(-15, Math.min(15, penalty + bonus));
  const score = Math.max(0, Math.min(100, 50 + adjustment));

  return { score, penalty, bonus, adjustment, estimatedNetMargin };
}
