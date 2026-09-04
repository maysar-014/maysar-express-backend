/**
 * CourierCostCalculator tariff decoupling tests (Phase 2 §2.3)
 */

import { CourierCostCalculator } from '../courier-cost-calculator';

const calc = new CourierCostCalculator();
const TARIFF = { baseOperatingCostTzs: 3000, costPerKmTzs: 400, costPerHourTzs: 6000 };

describe('CourierCostCalculator', () => {
  it('uses the documented fallback constants when no tariff is provided', () => {
    const est = calc.estimate(8, 25);
    expect(est.baseRate).toBe(2000);
    expect(est.distanceCost).toBe(8 * 500);
    expect(est.timeCost).toBe(25 * 200);
    expect(est.totalCompensation).toBe(2000 + 4000 + 5000);
  });

  it('reads every rate from the active VehicleTariff when provided', () => {
    const est = calc.estimate(8, 25, TARIFF);
    expect(est.baseRate).toBe(3000);                       // baseOperatingCostTzs
    expect(est.distanceCost).toBe(8 * 400);                // costPerKmTzs
    expect(est.timeCost).toBe(25 * (6000 / 60));           // costPerHourTzs → per-minute
    expect(est.totalCompensation).toBe(3000 + 3200 + 2500);
  });

  it('static getRates reflects a supplied tariff', () => {
    expect(CourierCostCalculator.getRates(TARIFF)).toEqual({
      baseRate: 3000,
      distanceRate: 400,
      timeRate: 100,
    });
    expect(CourierCostCalculator.getRates()).toEqual({
      baseRate: 2000,
      distanceRate: 500,
      timeRate: 200,
    });
  });
});