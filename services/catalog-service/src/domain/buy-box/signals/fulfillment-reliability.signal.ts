/**
 * Fulfillment Reliability Signal Computer
 * Requirements 7, 8: blends fulfillment rate with courier performance and COD risk.
 */

export interface FulfillmentReliabilityParams {
  /** Historical fulfillment success rate as a score 0–100. */
  fulfillmentRate: number;
  /** Optional courier performance score 0–100 for the buyer's zone. */
  courierPerformance?: number;
  /** Seller's COD refusal rate (0.0–1.0) over the rolling window. */
  codRefusalRate?: number;
  /** Buyer's selected payment method. COD penalties only apply when 'COD'. */
  paymentMethod?: string;
}

/**
 * Compute the Fulfillment Reliability Score (0–100).
 *
 * - Blends fulfillmentRate (70%) and courierPerformance (30%) when zone data is available.
 * - Applies COD risk penalties only when paymentMethod === 'COD':
 *   - codRefusalRate > 0.30 → CRITICAL_COD_RISK: −25
 *   - codRefusalRate > 0.15 → HIGH_COD_RISK: −10
 */
export function computeFulfillmentReliability(
  params: FulfillmentReliabilityParams
): number {
  const { fulfillmentRate, courierPerformance, codRefusalRate, paymentMethod } = params;

  // Base score: blend with courier performance when available
  let score =
    courierPerformance !== undefined
      ? fulfillmentRate * 0.70 + courierPerformance * 0.30
      : fulfillmentRate;

  // COD risk penalties — only when buyer pays COD
  if (paymentMethod === 'COD' && codRefusalRate !== undefined) {
    if (codRefusalRate > 0.30) {
      score -= 25; // CRITICAL_COD_RISK
    } else if (codRefusalRate > 0.15) {
      score -= 10; // HIGH_COD_RISK
    }
  }

  return Math.max(0, Math.min(100, score));
}
