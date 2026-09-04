/**
 * Phase 3 §3.1 — three-engine pure pipeline tests.
 * FulfillmentCostEngine, DriverCompensationEngine, BuyerPriceEngine.
 */

import { FulfillmentCostEngine } from '../fulfillment-cost.engine';
import { DriverCompensationEngine } from '../driver-compensation.engine';
import { BuyerPriceEngine } from '../buyer-price.engine';
import { VehicleTariff } from '../../entities/vehicle-tariff.entity';

const TARIFF = VehicleTariff.create({
  vehicleId: 'VHL_1',
  baseOperatingCostTzs: 2000,
  costPerKmTzs: 500,
  costPerHourTzs: 12000,   // = 200/min
  minimumJobCompensationTzs: 6000,
  loadingFeeTzs: 300,
  unloadingFeeTzs: 200,
  waitingRateTzsPerMinute: 50,
  freeWaitMinutes: 5,
});

const costEngine = new FulfillmentCostEngine();
const compEngine = new DriverCompensationEngine();
const priceEngine = new BuyerPriceEngine();

describe('FulfillmentCostEngine', () => {
  const baseInput = {
    distanceKm: 8,
    durationMinutes: 25,
    tariff: {
      baseOperatingCostTzs: TARIFF.baseOperatingCostTzs,
      costPerKmTzs: TARIFF.costPerKmTzs,
      costPerHourTzs: TARIFF.costPerHourTzs,
      loadingFeeTzs: TARIFF.loadingFeeTzs,
      unloadingFeeTzs: TARIFF.unloadingFeeTzs,
      waitingRateTzsPerMinute: TARIFF.waitingRateTzsPerMinute,
      freeWaitMinutes: TARIFF.freeWaitMinutes,
    },
  };

  it('computes base + distance + time + loading + unloading', () => {
    const b = costEngine.compute(baseInput);
    expect(b.baseCostTzs).toBe(2000);
    expect(b.distanceCostTzs).toBe(4000);   // 8 × 500
    expect(b.timeCostTzs).toBe(5000);       // 25 × 200
    expect(b.loadingFeeTzs).toBe(300);
    expect(b.unloadingFeeTzs).toBe(200);
    expect(b.waitingCostTzs).toBe(0);
    expect(b.totalFulfillmentCostTzs).toBe(11500);
  });

  it('charges waiting only beyond the free wait period', () => {
    expect(costEngine.compute({ ...baseInput, waitingMinutes: 5 }).waitingCostTzs).toBe(0);
    expect(costEngine.compute({ ...baseInput, waitingMinutes: 12 }).waitingCostTzs).toBe(350); // (12−5)×50
  });

  it('sums structured additional charges as line items', () => {
    const b = costEngine.compute({
      ...baseInput,
      additionalCharges: [
        { label: 'Ferry toll', amountTzs: 700, category: 'TOLL' },
        { label: 'Mall parking', amountTzs: 200, category: 'PARKING' },
      ],
    });
    expect(b.additionalCharges).toHaveLength(2);
    expect(b.additionalChargesTzs).toBe(900);
    expect(b.totalFulfillmentCostTzs).toBe(12400);
  });

  it('rejects negative tariff rates', () => {
    expect(() => costEngine.compute({
      ...baseInput,
      tariff: { ...baseInput.tariff, costPerKmTzs: -1 },
    })).toThrow(/cannot be negative/);
  });

  it('is deterministic', () => {
    expect(costEngine.compute(baseInput)).toEqual(costEngine.compute(baseInput));
  });
});

describe('DriverCompensationEngine', () => {
  const tariff = {
    baseOperatingCostTzs: TARIFF.baseOperatingCostTzs,
    costPerKmTzs: TARIFF.costPerKmTzs,
    costPerHourTzs: TARIFF.costPerHourTzs,
    minimumJobCompensationTzs: TARIFF.minimumJobCompensationTzs,
    waitingRateTzsPerMinute: TARIFF.waitingRateTzsPerMinute,
    freeWaitMinutes: TARIFF.freeWaitMinutes,
  };
  const baseInput = {
    distanceKm: 8,
    durationMinutes: 25,
    tariff,
    load: { weightKg: 5 },
  };

  it('computes the full compensation formula', () => {
    const b = compEngine.compute({
      ...baseInput,
      loadFactorRateTzsPerKg: 100,     // 5kg × 100 = 500
      stopCount: 3,                    // 2 extra stops × 500 = 1000
      stopCompensationTzs: 500,
      waitingMinutes: 12,              // (12−5)×50 = 350
      approvedExtras: [{ label: 'Rain gear', amountTzs: 200 }],
    });
    expect(b.baseCompensationTzs).toBe(2000);
    expect(b.distanceComponentTzs).toBe(4000);
    expect(b.timeComponentTzs).toBe(5000);
    expect(b.loadComponentTzs).toBe(500);
    expect(b.waitingCompensationTzs).toBe(350);
    expect(b.stopCompensationTzs).toBe(1000);
    expect(b.approvedExtrasTzs).toBe(200);
    expect(b.totalCompensationTzs).toBe(13050);
  });

  it('defaults load/stop/waiting/extras components to zero', () => {
    const b = compEngine.compute(baseInput);
    expect(b.loadComponentTzs).toBe(0);
    expect(b.stopCompensationTzs).toBe(0);
    expect(b.waitingCompensationTzs).toBe(0);
    expect(b.approvedExtrasTzs).toBe(0);
    expect(b.totalCompensationTzs).toBe(11000);
  });

  it('reports the hard minimum-earnings constraint', () => {
    const meets = compEngine.compute(baseInput);
    expect(meets.totalCompensationTzs).toBeGreaterThanOrEqual(meets.minimumJobCompensationTzs);
    expect(meets.meetsMinimumEarnings).toBe(true);
    expect(meets.minimumShortfallTzs).toBe(0);

    const short = compEngine.compute({ ...baseInput, distanceKm: 0.5, durationMinutes: 3 });
    expect(short.totalCompensationTzs).toBeLessThan(short.minimumJobCompensationTzs);
    expect(short.meetsMinimumEarnings).toBe(false);
    expect(short.minimumShortfallTzs).toBe(6000 - short.totalCompensationTzs);
  });

  it('assertOfferable throws for below-minimum compensation', () => {
    const short = compEngine.compute({ ...baseInput, distanceKm: 0.5, durationMinutes: 3 });
    expect(() => compEngine.assertOfferable(short)).toThrow(/never dispatched at a loss/);
    // And does NOT throw for an offerable one
    expect(() => compEngine.assertOfferable(compEngine.compute(baseInput))).not.toThrow();
  });
});

describe('BuyerPriceEngine', () => {
  const cheapTariff = {
    baseOperatingCostTzs: 2000,
    costPerKmTzs: 500,
    costPerHourTzs: 12000,
    loadingFeeTzs: 0,
    unloadingFeeTzs: 0,
    waitingRateTzsPerMinute: 0,
    freeWaitMinutes: 0,
  };
  const tinyTariff = {
    baseOperatingCostTzs: 1000,
    costPerKmTzs: 100,
    costPerHourTzs: 6000,
    loadingFeeTzs: 0,
    unloadingFeeTzs: 0,
    waitingRateTzsPerMinute: 0,
    freeWaitMinutes: 0,
  };

  it('derives buyer price = cost + margin − discount', () => {
    const cost = costEngine.compute({ distanceKm: 8, durationMinutes: 25, tariff: cheapTariff }); // 11000
    const price = priceEngine.compute({ fulfillmentCost: cost, serviceFee: { marginPct: 0.2 } });
    expect(price.fulfillmentCostTzs).toBe(11000);
    expect(price.maysarMarginTzs).toBe(2200);
    expect(price.discountAmountTzs).toBe(0);
    expect(price.finalBuyerPriceTzs).toBe(13200);
  });

  it('applies and caps discounts so the buyer price never goes negative', () => {
    const cost = costEngine.compute({ distanceKm: 1, durationMinutes: 5, tariff: tinyTariff }); // 1000+100+500 = 1600
    const price = priceEngine.compute({
      fulfillmentCost: cost,
      serviceFee: { marginPct: 0.1 },   // margin 160 → 1760
      discountTzs: 99999,
    });
    expect(price.discountAmountTzs).toBe(1760);
    expect(price.finalBuyerPriceTzs).toBe(0);
  });

  it('rounds the final price up to the configured increment', () => {
    const cost = costEngine.compute({ distanceKm: 1, durationMinutes: 5, tariff: tinyTariff });
    const price = priceEngine.compute({
      fulfillmentCost: cost,
      serviceFee: { marginPct: 0.1, roundingIncrementTzs: 500 }, // 1650 → 2000
    });
    expect(price.finalBuyerPriceTzs).toBe(2000);
  });

  it('rejects out-of-range marginPct and negative discounts', () => {
    const cost = costEngine.compute({ distanceKm: 1, durationMinutes: 5, tariff: tinyTariff });
    expect(() => priceEngine.compute({ fulfillmentCost: cost, serviceFee: { marginPct: 1.5 } })).toThrow(/marginPct/);
    expect(() => priceEngine.compute({ fulfillmentCost: cost, serviceFee: { marginPct: 0.1 }, discountTzs: -5 })).toThrow(/negative/);
  });
});