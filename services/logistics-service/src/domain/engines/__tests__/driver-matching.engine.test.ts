/**
 * DriverMatchingEngine tests (Phase 5 §5.1)
 */

import {
  DriverMatchingEngine,
  DriverCandidate,
  JobMatchContext,
  DEFAULT_MATCHING_WEIGHTS,
} from '../driver-matching.engine';

function candidate(overrides: Partial<DriverCandidate> = {}): DriverCandidate {
  return {
    driverId: 'drv-1',
    vehicleId: 'vhl-1',
    vehicleType: 'MOTORCYCLE',
    maxWeightKg: 30,
    committedWeightKg: 0,
    distanceToPickupKm: 5,
    etaMinutes: 15,
    reliabilityScore: 0.95,
    routeCompatibility: 0.8,
    estimatedCompensationTzs: 6000,
    servesAreas: ['Ilala'],
    jobArea: 'Ilala',
    isAvailable: true,
    ...overrides,
  };
}

function job(overrides: Partial<JobMatchContext> = {}): JobMatchContext {
  return {
    jobWeightKg: 5,
    requiredVehicleClass: null,
    minimumJobCompensationTzs: 4000,
    compensationPerKmTzs: 500,
    ...overrides,
  };
}

describe('DriverMatchingEngine', () => {
  const engine = new DriverMatchingEngine();

  it('excludes unavailable drivers with a reason (hard filter first)', () => {
    const [result] = engine.rank([candidate({ isAvailable: false })], job());
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe('DRIVER_UNAVAILABLE');
    expect(result.score).toBe(0);
  });

  it('excludes incompatible vehicle class when the job requires one', () => {
    const [result] = engine.rank(
      [candidate({ vehicleType: 'MOTORCYCLE' })],
      job({ requiredVehicleClass: 'VAN' }),
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe('VEHICLE_INCOMPATIBLE');
  });

  it('excludes drivers whose vehicle does not serve the job area', () => {
    const [result] = engine.rank([candidate({ servesAreas: ['Kinondoni'] })], job());
    expect(result.exclusionReason).toBe('AREA_NOT_SERVED');
  });

  it('enforces the minimum-earnings gate as a hard constraint (rule 3)', () => {
    const [result] = engine.rank(
      [candidate({ estimatedCompensationTzs: 3999 })],
      job({ minimumJobCompensationTzs: 4000 }),
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe('MINIMUM_EARNINGS_NOT_MET');
  });

  it('ranks eligible candidates by composite score, never cheapest alone', () => {
    const cheapButFar = candidate({
      driverId: 'drv-cheap',
      estimatedCompensationTzs: 4000, // cheapest
      distanceToPickupKm: 25,
      reliabilityScore: 0.6,
      routeCompatibility: 0.3,
      etaMinutes: 80,
    });
    const closeAndReliable = candidate({
      driverId: 'drv-best',
      estimatedCompensationTzs: 6500,
      distanceToPickupKm: 2,
      reliabilityScore: 0.98,
      routeCompatibility: 0.9,
      etaMinutes: 8,
    });
    const ranked = engine.rank([cheapButFar, closeAndReliable], job());
    expect(ranked[0].driverId).toBe('drv-best');
    expect(ranked[0].eligible).toBe(true);
    // Every component is within [0,1] for audit.
    for (const v of Object.values(ranked[0].scoreComponents)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('puts eligible drivers above excluded ones regardless of score', () => {
    // Job requires TRUCK: the high-score candidate is a MOTORCYCLE (default
    // helper type) — hard-incompatible — while the mediocre candidate is a
    // TRUCK and therefore the only offerable one.
    const greatButIncompatible = candidate({ driverId: 'drv-moto' }); // MOTORCYCLE
    const jobRequiringTruck = job({ requiredVehicleClass: 'TRUCK' });
    const mediocreEligible = candidate({
      driverId: 'drv-mediocre',
      vehicleType: 'TRUCK',
      reliabilityScore: 0.7,
      routeCompatibility: 0.4,
      distanceToPickupKm: 12,
    });
    const ranked = engine.rank([mediocreEligible, greatButIncompatible], jobRequiringTruck);
    expect(ranked[0].eligible).toBe(true);
    expect(ranked[1].eligible).toBe(false);
  });

  it('is deterministic for identical inputs (reproducibility, rule 4)', () => {
    const a = engine.rank([candidate(), candidate({ driverId: 'drv-2', distanceToPickupKm: 9 })], job());
    const b = engine.rank([candidate(), candidate({ driverId: 'drv-2', distanceToPickupKm: 9 })], job());
    expect(a).toEqual(b);
  });

  it('respects custom operator weights', () => {
    const far = candidate({ driverId: 'drv-far', distanceToPickupKm: 28, reliabilityScore: 0.5 });
    const withReliabilityDominant = engine.rank(
      [candidate(), far],
      job(),
      { ...DEFAULT_MATCHING_WEIGHTS, proximity: 0.0, reliability: 0.6 },
    );
    expect(withReliabilityDominant[0].driverId).toBe('drv-1'); // reliability 0.95 vs 0.5
  });
});
