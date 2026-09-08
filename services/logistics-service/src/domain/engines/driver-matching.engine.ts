/**
 * DriverMatchingEngine (Phase 5 §5.1)
 *
 * Ranks available drivers for a DeliveryJob using a composite score.
 * PURE — no I/O, no async, no side effects.
 *
 * Hierarchy per backlog rule 8: vehicle compatibility is a HARD FILTER first —
 * incompatible drivers are never ranked, they are excluded with a reason.
 * The minimum-earnings gate is likewise a hard constraint (backlog rule 3):
 * a job whose estimated compensation falls below the vehicle's
 * minimumJobCompensationTzs must not be offered at all.
 *
 * "Never assign on cheapest alone — assign on best feasible score."
 */

export interface DriverCandidate {
  driverId: string;
  vehicleId: string | null;
  vehicleType: string;
  maxWeightKg: number;
  committedWeightKg: number;
  distanceToPickupKm: number;
  etaMinutes: number;
  /** Delivery success rate over the last 90 days (0.0–1.0). */
  reliabilityScore: number;
  /** 0.0–1.0 — how well this job fits the driver's active route without major deviation. */
  routeCompatibility: number;
  estimatedCompensationTzs: number;
  servesAreas: string[];
  jobArea: string;
  isAvailable: boolean;
}

export interface JobMatchContext {
  jobWeightKg: number;
  requiredVehicleClass: string | null;
  /** Vehicle minimum job compensation (from the active VehicleTariff). */
  minimumJobCompensationTzs: number;
  /** Compensation per km at tariff rate — used for driver economics scoring. */
  compensationPerKmTzs: number;
}

export interface DriverMatchResult {
  driverId: string;
  vehicleId: string | null;
  vehicleType: string;
  score: number;
  eligible: boolean;
  exclusionReason: string | null;
  scoreComponents: {
    proximity: number;
    capacityHeadroom: number;
    reliability: number;
    routeFit: number;
    eta: number;
    driverEconomics: number;
  };
  estimatedCompensationTzs: number;
  etaMinutes: number;
  distanceToPickupKm: number;
}

export interface DriverMatchingWeights {
  proximity: number;
  capacity: number;
  reliability: number;
  routeFit: number;
  eta: number;
  driverEconomics: number;
}

/** Default weights — operators can override via OptimizationConfig in Phase 6. */
export const DEFAULT_MATCHING_WEIGHTS: DriverMatchingWeights = {
  proximity: 0.25,
  capacity: 0.15,
  reliability: 0.25,
  routeFit: 0.15,
  eta: 0.10,
  driverEconomics: 0.10,
};

const REFERENCE_DISTANCE_KM = 30;
const REFERENCE_ETA_MINUTES = 90;

export class DriverMatchingEngine {
  /**
   * Rank candidates. Hard filters (feasibility) run first; excluded drivers
   * are returned with eligible=false and a reason — never silently dropped.
   */
  rank(
    candidates: DriverCandidate[],
    job: JobMatchContext,
    weights: DriverMatchingWeights = DEFAULT_MATCHING_WEIGHTS,
  ): DriverMatchResult[] {
    return candidates
      .map(c => this.score(c, job, weights))
      .sort((a, b) => {
        // Eligible first, then by score descending — never cheapest alone.
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
      });
  }

  private score(
    c: DriverCandidate,
    job: JobMatchContext,
    w: DriverMatchingWeights,
  ): DriverMatchResult {
    const base: DriverMatchResult = {
      driverId: c.driverId,
      vehicleId: c.vehicleId,
      vehicleType: c.vehicleType,
      score: 0,
      eligible: true,
      exclusionReason: null,
      scoreComponents: {
        proximity: 0, capacityHeadroom: 0, reliability: 0, routeFit: 0, eta: 0, driverEconomics: 0,
      },
      estimatedCompensationTzs: c.estimatedCompensationTzs,
      etaMinutes: c.etaMinutes,
      distanceToPickupKm: c.distanceToPickupKm,
    };

    // ── Hard filters (backlog rule 8: feasibility before everything) ──────
    if (!c.isAvailable) return this.excluded(base, 'DRIVER_UNAVAILABLE');
    if (job.requiredVehicleClass && c.vehicleType !== job.requiredVehicleClass) {
      return this.excluded(base, 'VEHICLE_INCOMPATIBLE');
    }
    if (c.servesAreas.length > 0 && !c.servesAreas.includes(c.jobArea)) {
      return this.excluded(base, 'AREA_NOT_SERVED');
    }
    // Minimum-earnings gate (backlog rule 3 — hard constraint).
    if (c.estimatedCompensationTzs < job.minimumJobCompensationTzs) {
      return this.excluded(base, 'MINIMUM_EARNINGS_NOT_MET');
    }

    // ── Composite score ────────────────────────────────────────────────────
    const proximity = this.clamp01(1 - c.distanceToPickupKm / REFERENCE_DISTANCE_KM);
    const freeCapacity = c.maxWeightKg - c.committedWeightKg;
    const capacityHeadroom = c.maxWeightKg > 0
      ? this.clamp01((freeCapacity - job.jobWeightKg) / Math.max(c.maxWeightKg, 1))
      : 0;
    const reliability = this.clamp01(c.reliabilityScore);
    const routeFit = this.clamp01(c.routeCompatibility);
    const eta = this.clamp01(1 - c.etaMinutes / REFERENCE_ETA_MINUTES);
    // Driver economics: compensation per km vs the tariff rate — sustainable pay scores high.
    const perKm = c.estimatedCompensationTzs / Math.max(c.distanceToPickupKm, 1);
    const driverEconomics = job.compensationPerKmTzs > 0
      ? this.clamp01(perKm / (job.compensationPerKmTzs * 2))
      : 0.5;

    const score =
      w.proximity * proximity +
      w.capacity * capacityHeadroom +
      w.reliability * reliability +
      w.routeFit * routeFit +
      w.eta * eta +
      w.driverEconomics * driverEconomics;

    return {
      ...base,
      score: Math.round(score * 10000) / 10000,
      scoreComponents: { proximity, capacityHeadroom, reliability, routeFit, eta, driverEconomics },
    };
  }

  private excluded(r: DriverMatchResult, reason: string): DriverMatchResult {
    return { ...r, eligible: false, exclusionReason: reason, score: 0 };
  }

  private clamp01(v: number): number {
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }
}
