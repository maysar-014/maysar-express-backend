/**
 * Price Competitiveness Signal Computer
 * Requirement 4: rewards competitive pricing without triggering a race to the bottom.
 */

/** Compute the median of a non-empty array of numbers. */
export function computeMedian(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Compute the Price Competitiveness Score (0–100) for a seller's offer.
 *
 * - Single offer → 100
 * - Within ±5% of median → 100
 * - More than 5% below median → diminishing returns, capped at 85
 * - 5%–20% above median → linear decrease from 100 to 0
 * - More than 20% above median → 0
 */
export function computePriceCompetitiveness(
  offerPrice: number,
  allOfferPrices: number[]
): number {
  if (allOfferPrices.length <= 1) return 100;

  const median = computeMedian(allOfferPrices);
  if (median === 0) return 100;

  const ratio = offerPrice / median; // 1.0 = at median

  // Within ±5% band
  if (ratio >= 0.95 && ratio <= 1.05) return 100;

  // More than 5% below median — diminishing returns, cap at 85
  if (ratio < 0.95) {
    // As price drops further below median the score approaches 85 asymptotically
    const discount = (1 - ratio); // e.g. 0.10 for 10% below
    const score = 85 * (1 - Math.exp(-discount * 10));
    return Math.min(85, Math.max(0, score));
  }

  // 5%–20% above median — linear decrease from 100 to 0
  if (ratio <= 1.20) {
    const score = 100 * (1 - (ratio - 1.05) / 0.15);
    return Math.max(0, Math.min(100, score));
  }

  // More than 20% above median
  return 0;
}
