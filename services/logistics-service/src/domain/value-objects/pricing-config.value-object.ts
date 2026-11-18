/**
 * PricingConfig Value Object (v2)
 *
 * Redesigned to support delivery-strategy-specific pricing models.
 * The old single-formula model is replaced by strategy-aware cost models:
 *
 *   LOCAL_URBAN   → distance-band model
 *   METROPOLITAN  → distance-band model (extended bands)
 *   INTERCITY     → corridor model (line-haul + handling + last-mile)
 *   REMOTE        → configured explicitly or returns DELIVERY_UNAVAILABLE
 *
 * All pricing parameters remain database-configurable — nothing is hardcoded.
 * PricingConfig is immutable after construction.
 */

import { DeliveryStrategy } from '../engines/delivery-strategy';

// ─── Sub-type interfaces ──────────────────────────────────────────────────────

export interface DistanceBand {
  /** Upper bound of this band in km. Use Infinity for the last band. */
  maxDistanceKm: number;
  /** Fixed fulfillment cost for this entire band (TZS). Not a per-km rate. */
  fulfillmentCostTzs: number;
}

export interface WeightBand {
  /** Upper bound of this band in kg. Use Infinity for the last band. */
  maxWeightKg: number;
  /** Additional surcharge (TZS) added for packages in this weight range. */
  additionalCostTzs: number;
}

export interface PeakHourWindow {
  startHour: number; // 0–23 inclusive
  endHour: number;   // 0–23 exclusive
}

export interface OperationalSurchargeSchedule {
  peakHourSurchargeAmount: number;
  peakHours: PeakHourWindow[];
}

/**
 * Strategy-specific config for LOCAL_URBAN and METROPOLITAN.
 * Uses distance bands instead of a per-km rate applied after zone multipliers.
 * Time is used internally for ETA/operational purposes only — not as a customer charge.
 */
export interface DistanceBandStrategyConfig {
  distanceBands: DistanceBand[];
  weightBands: WeightBand[];
  operationalSurcharge: OperationalSurchargeSchedule;
}

/**
 * Intercity corridor: represents the logistics relationship between an origin
 * region and a destination region.
 *
 * The fulfillment cost for an intercity delivery is:
 *   originHandlingCostTzs
 *   + lineHaulBaseCostTzs
 *   + weightRateTzsPerKg × actualWeightKg          (weight-proportional line-haul share)
 *   + destinationHandlingCostTzs
 *   + lastMileCostTzs
 */
export interface IntercityCorridorConfig {
  /** Unique key for this corridor, e.g. "DAR_ARUSHA" */
  corridorKey: string;
  /** Origin region name(s) this corridor covers */
  originRegions: string[];
  /** Destination region name(s) this corridor covers */
  destinationRegions: string[];
  /** Bidirectional: if true, origin and destination regions are interchangeable */
  bidirectional: boolean;
  /** Cost of origin pickup and consolidation (TZS) */
  originHandlingCostTzs: number;
  /** Base line-haul transport cost for this corridor (TZS) */
  lineHaulBaseCostTzs: number;
  /** Per-kg additional line-haul cost (weight proportionality) */
  weightRateTzsPerKg: number;
  /** Cost of destination handling/sorting (TZS) */
  destinationHandlingCostTzs: number;
  /** Cost of last-mile delivery at destination (TZS) */
  lastMileCostTzs: number;
  /** Estimated transit time in hours */
  estimatedTransitHours: number;
  /** Whether this corridor is currently active */
  isActive: boolean;
}

export interface CodPolicyConfig {
  /**
   * Fixed COD service charge (TZS) — independent of delivery distance/cost.
   * Covers cash handling, reconciliation risk, and failed-delivery re-attempt.
   */
  fixedChargeTzs: number;
  /**
   * Optional: small percentage of item value for high-value COD orders.
   * Set to 0 to disable value-based surcharge.
   */
  valueSurchargeRate: number;
  /** Threshold above which valueSurchargeRate applies (TZS) */
  valueSurchargeThresholdTzs: number;
}

// ─── Main config interface ────────────────────────────────────────────────────

export interface PricingConfigData {
  version: number;

  // ── Platform margin ─────────────────────────────────────────────────────────
  /** Platform margin as a fraction of fulfillment cost (not of final fee). e.g. 0.20 = 20% */
  platformMarginPct: number;

  // ── Payment processing rates (MYS-DEL-001 Article 29 correction 8) ──────────
  /** Mobile money processing rate [0,1]. Default 0.01 when absent. */
  mobileMoneyProcessingRatePct?: number;
  /** Card processing rate [0,1]. Default 0.015 when absent. */
  cardProcessingRatePct?: number;
  /** COD cash-handling rate [0,1]. Default 0.005 when absent. */
  codProcessingRatePct?: number;

  // ── Floor / ceiling / rounding ──────────────────────────────────────────────
  floorPriceTzs: number;
  ceilingPriceTzs: number;
  roundingIncrementTzs: number;

  // ── COD policy (independent of delivery economics) ──────────────────────────
  codPolicy: CodPolicyConfig;

  // ── Local urban strategy ────────────────────────────────────────────────────
  localUrban: DistanceBandStrategyConfig;

  // ── Metropolitan strategy ───────────────────────────────────────────────────
  metropolitan: DistanceBandStrategyConfig;

  // ── Intercity corridors ─────────────────────────────────────────────────────
  intercityCorridors: IntercityCorridorConfig[];

  /**
   * Fallback intercity config used when no specific corridor matches.
   * If null, unmatched intercity routes return DELIVERY_UNAVAILABLE.
   */
  intercityFallback: IntercityCorridorConfig | null;

  // ── Remote strategy ─────────────────────────────────────────────────────────
  /**
   * Whether remote deliveries should return DELIVERY_UNAVAILABLE.
   * When false, intercityFallback is used for REMOTE routes.
   */
  remoteUnavailable: boolean;

  // ── Quote settings ──────────────────────────────────────────────────────────
  quoteValiditySeconds: number;
  routingCacheTtlMs: number;

  // ── Consolidation parameters (optional — defaults in PricingConfig getters) ──
  consolidationRadiusKm?: number;           // default 5.0 km
  maxConsolidatedRouteOverheadPct?: number; // default 1.40 (40%)
  maxGroupWeightKg?: number;                // default 20.0 kg
  allocationAlgorithm?: 'weight_proportional'; // default 'weight_proportional'

  isActive: boolean;
  createdAt: Date;
}

// ─── Value Object ─────────────────────────────────────────────────────────────

export class PricingConfig {
  private readonly data: PricingConfigData;

  constructor(data: PricingConfigData) {
    this.validate(data);
    this.data = JSON.parse(JSON.stringify(data)) as PricingConfigData;
  }

  static fromPersisted(data: PricingConfigData): PricingConfig {
    return new PricingConfig(data);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────
  get version(): number { return this.data.version; }
  get platformMarginPct(): number { return this.data.platformMarginPct; }
  /** Mobile money processing rate. Defaults to 0.01 (1%) when not configured. */
  get mobileMoneyProcessingRatePct(): number { return this.data.mobileMoneyProcessingRatePct ?? 0.01; }
  /** Card processing rate. Defaults to 0.015 (1.5%) when not configured. */
  get cardProcessingRatePct(): number { return this.data.cardProcessingRatePct ?? 0.015; }
  /** COD cash-handling rate. Defaults to 0.005 (0.5%) when not configured. */
  get codProcessingRatePct(): number { return this.data.codProcessingRatePct ?? 0.005; }
  get floorPriceTzs(): number { return this.data.floorPriceTzs; }
  get ceilingPriceTzs(): number { return this.data.ceilingPriceTzs; }
  get roundingIncrementTzs(): number { return this.data.roundingIncrementTzs; }
  get codPolicy(): CodPolicyConfig { return { ...this.data.codPolicy }; }
  get localUrban(): DistanceBandStrategyConfig { return this.data.localUrban; }
  get metropolitan(): DistanceBandStrategyConfig { return this.data.metropolitan; }
  get intercityCorridors(): IntercityCorridorConfig[] { return [...this.data.intercityCorridors]; }
  get intercityFallback(): IntercityCorridorConfig | null { return this.data.intercityFallback; }
  get remoteUnavailable(): boolean { return this.data.remoteUnavailable; }
  get quoteValiditySeconds(): number { return this.data.quoteValiditySeconds; }
  get routingCacheTtlMs(): number { return this.data.routingCacheTtlMs; }
  get isActive(): boolean { return this.data.isActive; }
  get createdAt(): Date { return this.data.createdAt; }

  // ── Consolidation parameter getters (with defaults) ─────────────────────
  get consolidationRadiusKm(): number {
    return Number(this.data.consolidationRadiusKm ?? 5.0);
  }
  get maxConsolidatedRouteOverheadPct(): number {
    return Number(this.data.maxConsolidatedRouteOverheadPct ?? 1.40);
  }
  get maxGroupWeightKg(): number {
    return Number(this.data.maxGroupWeightKg ?? 20.0);
  }
  get allocationAlgorithm(): 'weight_proportional' {
    return (this.data.allocationAlgorithm ?? 'weight_proportional') as 'weight_proportional';
  }

  // ── Domain helpers ──────────────────────────────────────────────────────────

  getStrategyConfig(strategy: DeliveryStrategy): DistanceBandStrategyConfig | null {
    if (strategy === 'LOCAL_URBAN') return this.data.localUrban;
    if (strategy === 'METROPOLITAN') return this.data.metropolitan;
    return null; // intercity/remote use corridor model
  }

  /**
   * Find the best matching corridor for an intercity/remote delivery.
   * Checks corridorKey match first, then origin/destination region match.
   */
  findCorridor(originRegion: string, destinationRegion: string): IntercityCorridorConfig | null {
    const normalizeRegion = (r: string) => r.toLowerCase().trim();
    const orig = normalizeRegion(originRegion);
    const dest = normalizeRegion(destinationRegion);

    for (const corridor of this.data.intercityCorridors) {
      if (!corridor.isActive) continue;

      const origRegions = corridor.originRegions.map(normalizeRegion);
      const destRegions = corridor.destinationRegions.map(normalizeRegion);

      const forwardMatch = origRegions.includes(orig) && destRegions.includes(dest);
      const reverseMatch = corridor.bidirectional &&
        origRegions.includes(dest) && destRegions.includes(orig);

      if (forwardMatch || reverseMatch) return corridor;
    }

    return this.data.intercityFallback;
  }

  /**
   * Get the fulfillment cost from a distance-band strategy config.
   * Returns the cost for the first band where distanceKm <= maxDistanceKm.
   */
  getDistanceBandCost(strategyConfig: DistanceBandStrategyConfig, distanceKm: number): number {
    const sorted = [...strategyConfig.distanceBands].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
    for (const band of sorted) {
      if (distanceKm <= band.maxDistanceKm) return band.fulfillmentCostTzs;
    }
    // Beyond all bands — use last band cost
    return sorted[sorted.length - 1]?.fulfillmentCostTzs ?? 0;
  }

  /**
   * Get the additional weight surcharge from a strategy config.
   * Weight surcharge is additive — NOT a multiplier of the base cost.
   */
  getWeightSurcharge(strategyConfig: DistanceBandStrategyConfig, weightKg: number): number {
    const sorted = [...strategyConfig.weightBands].sort((a, b) => a.maxWeightKg - b.maxWeightKg);
    for (const band of sorted) {
      if (weightKg <= band.maxWeightKg) return band.additionalCostTzs;
    }
    return sorted[sorted.length - 1]?.additionalCostTzs ?? 0;
  }

  isPeakHour(hour: number, strategyConfig: DistanceBandStrategyConfig): boolean {
    return strategyConfig.operationalSurcharge.peakHours.some(
      w => hour >= w.startHour && hour < w.endHour,
    );
  }

  toJSON(): PricingConfigData {
    return JSON.parse(JSON.stringify(this.data)) as PricingConfigData;
  }

  private validate(data: PricingConfigData): void {
    const errors: string[] = [];
    if (!Number.isInteger(data.version) || data.version < 1) errors.push('version must be a positive integer');
    if (data.platformMarginPct < 0 || data.platformMarginPct > 2) errors.push('platformMarginPct must be in [0, 2]');
    if (data.floorPriceTzs < 0) errors.push('floorPriceTzs must be >= 0');
    if (data.ceilingPriceTzs < data.floorPriceTzs) errors.push('ceilingPriceTzs must be >= floorPriceTzs');
    if (!Number.isInteger(data.roundingIncrementTzs) || data.roundingIncrementTzs < 1) errors.push('roundingIncrementTzs must be a positive integer');
    if (!data.localUrban?.distanceBands?.length) errors.push('localUrban.distanceBands must not be empty');
    if (!data.metropolitan?.distanceBands?.length) errors.push('metropolitan.distanceBands must not be empty');
    if (data.quoteValiditySeconds < 1) errors.push('quoteValiditySeconds must be >= 1');
    if (data.routingCacheTtlMs < 0) errors.push('routingCacheTtlMs must be >= 0');
    if (errors.length > 0) throw new Error(`Invalid PricingConfig: ${errors.join('; ')}`);
  }
}

// ─── Backward compatibility aliases ──────────────────────────────────────────
// The old interfaces are exported so existing tests compile without changes.
// New code should use the typed structures above.
export type ZoneMultipliers = { same_ward: number; same_district: number; same_region: number; cross_region: number };
export type PackageWeightTier = { maxWeightKg: number; multiplier: number };
