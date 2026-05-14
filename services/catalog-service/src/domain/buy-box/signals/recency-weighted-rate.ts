/**
 * Recency-Weighted Rate Computer
 * Requirement 3: exponential decay weighting within a 90-day rolling window.
 * Recent events (last 30 days) weight 1.0; older events (31–90 days) weight 0.5.
 * Bayesian prior blending for low-volume sellers.
 */

export interface RecencyRateEvent {
  occurredAt: Date;
  isNegative: boolean; // true = dispute / cancellation / return / failure
}

export interface RecencyRateOptions {
  /** Rolling window in days. Default: 90. */
  windowDays?: number;
  /** Platform-wide category average rate for Bayesian prior. Default: 0.05. */
  platformAverage?: number;
  /** Reference point for "now". Defaults to Date.now(). Useful for testing. */
  now?: Date;
}

export interface RecencyRateResult {
  /** Weighted negative rate (0.0–1.0). */
  rate: number;
  /** True when the seller has zero orders in the window (new seller). */
  isNewSeller: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_THRESHOLD_DAYS = 30;
const BAYESIAN_PRIOR_WEIGHT = 10; // virtual order count for prior

/**
 * Compute a recency-weighted negative rate for a seller.
 *
 * - Events in the last 30 days: weight 1.0
 * - Events in days 31–90: weight 0.5
 * - Zero events → return platformAverage, flag as new seller
 * - Fewer than 10 events → Bayesian blend with platformAverage
 */
export function computeRecencyWeightedRate(
  events: RecencyRateEvent[],
  options: RecencyRateOptions = {}
): RecencyRateResult {
  const windowDays = options.windowDays ?? 90;
  const platformAverage = options.platformAverage ?? 0.05;
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const windowMs = windowDays * MS_PER_DAY;
  const recentMs = RECENT_THRESHOLD_DAYS * MS_PER_DAY;

  // Filter to events within the rolling window
  const windowEvents = events.filter(
    (e) => nowMs - e.occurredAt.getTime() <= windowMs
  );

  if (windowEvents.length === 0) {
    return { rate: platformAverage, isNewSeller: true };
  }

  // Compute weighted sums
  let weightedNegatives = 0;
  let totalWeight = 0;

  for (const event of windowEvents) {
    const ageMs = nowMs - event.occurredAt.getTime();
    const weight = ageMs <= recentMs ? 1.0 : 0.5;
    totalWeight += weight;
    if (event.isNegative) weightedNegatives += weight;
  }

  const observedRate = totalWeight > 0 ? weightedNegatives / totalWeight : 0;

  // Bayesian prior blending for low-volume sellers (< 10 events)
  if (windowEvents.length < 10) {
    const blendedRate =
      (observedRate * windowEvents.length + platformAverage * BAYESIAN_PRIOR_WEIGHT) /
      (windowEvents.length + BAYESIAN_PRIOR_WEIGHT);
    return { rate: blendedRate, isNewSeller: false };
  }

  return { rate: observedRate, isNewSeller: false };
}
