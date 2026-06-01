import { TrustSignalType, TrustTier, SIGNAL_WEIGHTS } from './trust-signal.types';

// ─── Score application ────────────────────────────────────────────────────────

/**
 * Apply a trust signal delta to the current score, clamping to [0, 100].
 * Pure function — no I/O.
 */
export function applySignal(currentScore: number, signal: TrustSignalType): number {
  const delta = SIGNAL_WEIGHTS[signal];
  return Math.max(0, Math.min(100, currentScore + delta));
}

// ─── Tier derivation (dual-axis) ──────────────────────────────────────────────

/**
 * Derive the Trust_Tier from both the behavioral score and the lifetime COD value.
 * Both thresholds must be satisfied simultaneously for a tier to be granted.
 *
 * Tier thresholds:
 *   PLATINUM_BUYER:   score >= 85 AND lifetimeCODValue >= 10,000,000 TZS
 *   GOLD_BUYER:       score >= 65 AND lifetimeCODValue >= 2,000,000 TZS
 *   TRUSTED_BUYER:    score >= 41 AND lifetimeCODValue >= 500,000 TZS
 *   TRUSTED_BEGINNER: score >= 21 AND lifetimeCODValue >= 100,000 TZS
 *   NEW_BUYER:        all others
 */
export function deriveTier(score: number, lifetimeCODValue: number): TrustTier {
  if (score >= 85 && lifetimeCODValue >= 10_000_000) return 'PLATINUM_BUYER';
  if (score >= 65 && lifetimeCODValue >= 2_000_000)  return 'GOLD_BUYER';
  if (score >= 41 && lifetimeCODValue >= 500_000)    return 'TRUSTED_BUYER';
  if (score >= 21 && lifetimeCODValue >= 100_000)    return 'TRUSTED_BEGINNER';
  return 'NEW_BUYER';
}

// ─── Exposure limits ──────────────────────────────────────────────────────────

/**
 * Maximum total active COD exposure (TZS) for a given tier.
 * Active exposure = sum of all outstanding (undelivered) COD order values.
 */
export function getExposureLimit(tier: TrustTier): number {
  switch (tier) {
    case 'NEW_BUYER':        return 30_000;
    case 'TRUSTED_BEGINNER': return 150_000;
    case 'TRUSTED_BUYER':    return 500_000;
    case 'GOLD_BUYER':       return 2_000_000;
    case 'PLATINUM_BUYER':   return 10_000_000;
  }
}

/**
 * @deprecated Use getExposureLimit instead.
 * Kept for backward compatibility with callers outside PlaceOrderUseCase.
 * Returns null for TRUSTED_BUYER+ to preserve old interface; prefer getExposureLimit.
 */
export function getCODLimit(tier: TrustTier): number | null {
  if (tier === 'NEW_BUYER')        return 30_000;
  if (tier === 'TRUSTED_BEGINNER') return 150_000;
  return null; // TRUSTED_BUYER and above — use getExposureLimit for the actual cap
}

// ─── Concurrency limits ───────────────────────────────────────────────────────

/**
 * Maximum number of simultaneously active COD orders for a given tier.
 * Returns Infinity for PLATINUM_BUYER (no limit).
 */
export function getConcurrentOrderLimit(tier: TrustTier): number {
  switch (tier) {
    case 'NEW_BUYER':        return 1;
    case 'TRUSTED_BEGINNER': return 2;
    case 'TRUSTED_BUYER':    return 3;
    case 'GOLD_BUYER':       return 5;
    case 'PLATINUM_BUYER':   return Infinity;
  }
}

// ─── Geographic radius ────────────────────────────────────────────────────────

/**
 * Maximum Haversine radius (km) from the seller's ward centroid for COD delivery.
 * Returns null for tiers that use region-level or nationwide checks instead of radius.
 *
 *   NEW_BUYER:        24 km  (ward-centroid Haversine)
 *   TRUSTED_BEGINNER: 50 km  (ward-centroid Haversine)
 *   TRUSTED_BUYER:    null   (same-region check — no radius cap)
 *   GOLD_BUYER:       null   (nationwide — no restriction)
 *   PLATINUM_BUYER:   null   (nationwide — no restriction)
 */
export function getRadiusKm(tier: TrustTier): number | null {
  switch (tier) {
    case 'NEW_BUYER':        return 24;
    case 'TRUSTED_BEGINNER': return 50;
    case 'TRUSTED_BUYER':    return null;
    case 'GOLD_BUYER':       return null;
    case 'PLATINUM_BUYER':   return null;
  }
}

// ─── Haversine distance ───────────────────────────────────────────────────────

/**
 * Compute the great-circle (Haversine) distance between two lat/lng points.
 * Pure function — no I/O. Uses Earth radius 6371 km.
 * Accurate to within ~0.3% at Tanzania's latitudes — sufficient for radius gate checks.
 *
 * @returns Distance in kilometres.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── Score replay ─────────────────────────────────────────────────────────────

/**
 * Replay a sequence of score events from 0 to reproduce the final score.
 * Handles legacy COURIER_NEGATIVE_REPORT events by using the
 * COURIER_UNREACHABLE_CUSTOMER weight (-5) for backward-compatible replay.
 *
 * @param events Array of { delta, signalType? } records from the Score_Event log.
 */
export function replayScore(
  events: Array<{ delta: number; signalType?: string }>,
): number {
  return events.reduce((score, event) => {
    // Backward-compat: legacy COURIER_NEGATIVE_REPORT stored delta -8,
    // but we replay it as -5 (COURIER_UNREACHABLE_CUSTOMER) for consistency.
    const delta =
      event.signalType === 'COURIER_NEGATIVE_REPORT' ? -5 : event.delta;
    return Math.max(0, Math.min(100, score + delta));
  }, 0);
}
