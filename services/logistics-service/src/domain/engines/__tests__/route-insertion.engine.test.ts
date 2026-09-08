/**
 * RouteInsertionEngine tests (Phase 5 §5.2)
 */

import { RouteInsertionEngine, InsertionInput, RouteStop } from '../route-insertion.engine';

const TARIFF = { costPerKmTzs: 450, costPerHourTzs: 3000, loadingFeeTzs: 200, unloadingFeeTzs: 200 };

function route(points: Array<[number, number]>): RouteStop[] {
  return points.map(([lat, lng]) => ({ lat, lng }));
}

/** Dar es Salaam inner-city geometry: Mikocheni → Masaki → City Centre. */
function baseInput(overrides: Partial<InsertionInput> = {}): InsertionInput {
  return {
    currentRoute: [
      { lat: -6.798, lng: 39.244 },  // Mikocheni (pickup)
      { lat: -6.821, lng: 39.285 },  // City Centre (drop)
    ],
    shipment: {
      shipmentId: 'shp-1',
      // Msasani-corridor stop ~1 km off the direct Mikocheni → City Centre
      // path: small real detour (~0.4 road-km ≈ TZS 219), i.e. a genuinely
      // cheap insertion. (Mbezi would be an ~8 km detour ≈ TZS 5.9k — over
      // the threshold, and the "distant detour" case already covers far.)
      pickup: { lat: -6.8005, lng: 39.2645 },
      drop: { lat: -6.823, lng: 39.283 },     // near City Centre
      weightKg: 3,
      requiredVehicleClass: null,
    },
    vehicle: { vehicleType: 'MOTORCYCLE', maxWeightKg: 30, committedWeightKg: 5 },
    tariff: TARIFF,
    insertionCostThresholdTzs: 5000,
    ...overrides,
  };
}

describe('RouteInsertionEngine', () => {
  const engine = new RouteInsertionEngine();

  it('flags a cheap nearby stop as feasible with a positive marginal cost', () => {
    const result = engine.evaluate(baseInput());
    expect(result.feasible).toBe(true);
    expect(result.marginalCostTzs).toBeGreaterThan(0);
    expect(result.marginalCostTzs).toBeLessThan(5000);
    expect(result.rejectionReason).toBeNull();
    expect(result.additionalDistanceKm).toBeGreaterThan(0);
    expect(result.additionalDurationMinutes).toBeGreaterThan(0);
  });

  it('rejects on vehicle class mismatch before costing anything', () => {
    const result = engine.evaluate(
      baseInput({ shipment: { ...baseInput().shipment, requiredVehicleClass: 'VAN' } }),
    );
    expect(result.feasible).toBe(false);
    expect(result.rejectionReason).toBe('VEHICLE_CLASS');
  });

  it('rejects when committed + new weight exceeds vehicle capacity', () => {
    const result = engine.evaluate(
      baseInput({ vehicle: { vehicleType: 'MOTORCYCLE', maxWeightKg: 30, committedWeightKg: 28 } }),
    );
    expect(result.feasible).toBe(false);
    expect(result.rejectionReason).toBe('CAPACITY');
  });

  it('records infeasible THRESHOLD results (escalated, not silently dropped)', () => {
    const result = engine.evaluate(baseInput({ insertionCostThresholdTzs: 10 }));
    expect(result.feasible).toBe(false);
    expect(result.rejectionReason).toBe('THRESHOLD');
    expect(result.marginalCostTzs).toBeGreaterThan(10); // cost still computed for audit
  });

  it('produces a larger marginal cost for a distant detour shipment', () => {
    const nearby = engine.evaluate(baseInput());
    const distant = engine.evaluate(
      baseInput({
        shipment: {
          ...baseInput().shipment,
          pickup: { lat: -6.45, lng: 38.7 }, // far outside Dar
          drop: { lat: -6.46, lng: 38.72 },
        },
      }),
    );
    expect(distant.marginalCostTzs).toBeGreaterThan(nearby.marginalCostTzs);
  });

  it('is deterministic for identical inputs (reproducibility, rule 4)', () => {
    expect(engine.evaluate(baseInput())).toEqual(engine.evaluate(baseInput()));
  });
});
