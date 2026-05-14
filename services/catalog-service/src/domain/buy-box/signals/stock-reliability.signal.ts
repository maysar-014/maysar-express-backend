/**
 * Stock Reliability Signal Computer
 * Requirement 1: measures historical rate of fulfilling orders without stock-out cancellations.
 */

export interface StockReliabilityParams {
  /** Rate of orders cancelled due to stock-out (0.0–1.0). */
  stockOutCancellationRate: number;
  /** Current reported stock level for the product variant. */
  currentStockLevel: number;
}

/**
 * Compute the Stock Reliability Score (0–100).
 *
 * - Zero current stock → 0 immediately (seller is ineligible anyway, but score reflects it)
 * - Base score from inverted stockOutCancellationRate
 * - Stock level bonus: ≥100 units → +5; ≥20 units → +2
 */
export function computeStockReliability(params: StockReliabilityParams): number {
  const { stockOutCancellationRate, currentStockLevel } = params;

  if (currentStockLevel <= 0) return 0;

  const base = (1 - Math.max(0, Math.min(1, stockOutCancellationRate))) * 100;

  let bonus = 0;
  if (currentStockLevel >= 100) bonus = 5;
  else if (currentStockLevel >= 20) bonus = 2;

  return Math.max(0, Math.min(100, base + bonus));
}
