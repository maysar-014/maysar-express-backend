/**
 * Rate Signal Computer
 * Requirements 1, 3: converts a raw rate (0–1) to an inverted score (0–100).
 * Used for disputeRate, cancellationRate, and returnRate signals.
 */

/**
 * Convert a rate (0.0–1.0) to an inverted score (0–100).
 *
 * - rate 0.0 → score 100 (no incidents)
 * - rate 1.0 → score 0   (all orders are incidents)
 */
export function computeRateSignal(rate: number): number {
  return Math.max(0, Math.min(100, (1 - rate) * 100));
}
