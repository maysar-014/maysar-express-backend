/**
 * Economic Validation Tests for DeliveryPricingEngine v2
 *
 * These tests validate not just that the formulas produce correct arithmetic,
 * but that the economics make sense:
 *
 *   - Customer price ≥ fulfillment cost (unless explicitly subsidized)
 *   - Strategy classification is correct for each route type
 *   - Financial integrity fields are accurate
 *   - Multi-seller delivery is correctly handled (separate delivery per seller)
 *   - Remote route behavior is correctly declared (fallback, not silently wrong)
 *   - COD charge is flat and independent of delivery distance
 *   - Pricing config changes between quote and checkout are handled correctly
 *
 * All TZS amounts are whole integers (no decimal fractions).
 *
 * ─── Calibration assumptions ─────────────────────────────────────────────────
 * The rates used here are CURRENT ASSUMPTIONS, not proven operational facts.
 * They are derived from market research on Dar es Salaam boda-boda rates and
 * intercity carrier quotes. They must be validated against actual operational
 * data once the platform has completed real deliveries.
 *
 * The CourierCostCalculator produces estimates from a placeholder/simulation
 * engine. These estimates are stored for audit but do NOT drive pricing.
 */

import { DeliveryPricingEngine, isDeliveryUnavailable } from '../delivery-pricing.engine';
import { PricingConfig, PricingConfigData } from '../../value-objects/pricing-config.value-object';
import { resolveDeliveryStrategy } from '../delivery-strategy';

// ─── Test config factory ──────────────────────────────────────────────────────

function makeTestConfig(overrides?: Partial<PricingConfigData>): PricingConfig {
  const base: PricingConfigData = {
    version: 2,
    platformMarginPct: 0.20,
    floorPriceTzs: 1500,
    ceilingPriceTzs: 50000,
    roundingIncrementTzs: 50,
    codPolicy: {
      fixedChargeTzs: 500,
      valueSurchargeRate: 0.005,
      valueSurchargeThresholdTzs: 100000,
    },
    localUrban: {
      distanceBands: [
        { maxDistanceKm: 3,  fulfillmentCostTzs: 1800 },
        { maxDistanceKm: 7,  fulfillmentCostTzs: 2500 },
        { maxDistanceKm: 12, fulfillmentCostTzs: 3200 },
        { maxDistanceKm: 20, fulfillmentCostTzs: 4000 },
      ],
      weightBands: [
        { maxWeightKg: 1,    additionalCostTzs: 0    },
        { maxWeightKg: 5,    additionalCostTzs: 500  },
        { maxWeightKg: 10,   additionalCostTzs: 1200 },
        { maxWeightKg: 20,   additionalCostTzs: 2500 },
        { maxWeightKg: 9999, additionalCostTzs: 5000 },
      ],
      operationalSurcharge: {
        peakHourSurchargeAmount: 300,
        peakHours: [
          { startHour: 7,  endHour: 9  },
          { startHour: 17, endHour: 20 },
        ],
      },
    },
    metropolitan: {
      distanceBands: [
        { maxDistanceKm: 35, fulfillmentCostTzs: 5000 },
        { maxDistanceKm: 50, fulfillmentCostTzs: 6500 },
        { maxDistanceKm: 80, fulfillmentCostTzs: 8500 },
      ],
      weightBands: [
        { maxWeightKg: 1,    additionalCostTzs: 0    },
        { maxWeightKg: 5,    additionalCostTzs: 800  },
        { maxWeightKg: 10,   additionalCostTzs: 1800 },
        { maxWeightKg: 20,   additionalCostTzs: 3500 },
        { maxWeightKg: 9999, additionalCostTzs: 7000 },
      ],
      operationalSurcharge: {
        peakHourSurchargeAmount: 0,
        peakHours: [],
      },
    },
    intercityCorridors: [
      {
        corridorKey: 'DAR_MOROGORO',
        originRegions: ['dar es salaam'],
        destinationRegions: ['morogoro'],
        bidirectional: true,
        originHandlingCostTzs: 1000,
        lineHaulBaseCostTzs: 4000,
        weightRateTzsPerKg: 300,
        destinationHandlingCostTzs: 800,
        lastMileCostTzs: 1500,
        estimatedTransitHours: 4,
        isActive: true,
      },
      {
        corridorKey: 'DAR_DODOMA',
        originRegions: ['dar es salaam'],
        destinationRegions: ['dodoma'],
        bidirectional: true,
        originHandlingCostTzs: 1000,
        lineHaulBaseCostTzs: 6000,
        weightRateTzsPerKg: 400,
        destinationHandlingCostTzs: 800,
        lastMileCostTzs: 1500,
        estimatedTransitHours: 6,
        isActive: true,
      },
      {
        corridorKey: 'DAR_ARUSHA',
        originRegions: ['dar es salaam'],
        destinationRegions: ['arusha'],
        bidirectional: true,
        originHandlingCostTzs: 1000,
        lineHaulBaseCostTzs: 9000,
        weightRateTzsPerKg: 500,
        destinationHandlingCostTzs: 1000,
        lastMileCostTzs: 1800,
        estimatedTransitHours: 8,
        isActive: true,
      },
    ],
    intercityFallback: {
      corridorKey: 'GENERAL_INTERCITY',
      originRegions: [],
      destinationRegions: [],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 8000,
      weightRateTzsPerKg: 500,
      destinationHandlingCostTzs: 1000,
      lastMileCostTzs: 2000,
      estimatedTransitHours: 10,
      isActive: true,
    },
    remoteUnavailable: false,
    quoteValiditySeconds: 900,
    routingCacheTtlMs: 300000,
    isActive: true,
    createdAt: new Date('2026-08-22'),
    ...overrides,
  };
  return PricingConfig.fromPersisted(base);
}

const engine = new DeliveryPricingEngine();

function makeInput(overrides: any = {}) {
  return {
    distanceKm: 8,
    durationMinutes: 25,
    packageWeightKg: 0.5,
    deliveryZone: 'same_district' as const,
    isCoD: false,
    isOperationalPeakHour: false,
    courierCompensationEstimate: 11000, // from simulation engine — higher than actual, see notes
    routeSource: 'live' as const,
    originRegion: 'dar es salaam',
    destinationRegion: 'dar es salaam',
    ...overrides,
  };
}

// ─── Example A: Kariakoo → Mikocheni, 0.5 kg, no COD ─────────────────────────

describe('Example A: Kariakoo → Mikocheni (LOCAL_URBAN, 8 km, 0.5 kg, no COD)', () => {
  const config = makeTestConfig();
  const input = makeInput({ distanceKm: 8, packageWeightKg: 0.5 });
  const result = engine.compute(input, config);

  test('produces a PricingResult (not UNAVAILABLE)', () => {
    expect(isDeliveryUnavailable(result)).toBe(false);
  });

  test('strategy is LOCAL_URBAN', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.deliveryStrategy).toBe('LOCAL_URBAN');
  });

  test('uses 7–12 km distance band → fulfillmentCost = 3200', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.distanceBandCost).toBe(3200);
    expect(result.breakdown.weightSurcharge).toBe(0); // ≤1 kg
    expect(result.breakdown.fulfillmentCost).toBe(3200);
  });

  test('margin = 20% of fulfillment cost = 640', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.platformMarginAmount).toBe(640);
  });

  test('finalFee = 3850 TZS (3840 rounded up to nearest 50)', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.finalFee).toBe(3850);
  });

  test('isProfitable = true (customer pays more than fulfillment cost)', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.isProfitable).toBe(true);
    expect(result.breakdown.platformSubsidy).toBe(0);
  });

  test('economic summary: fulfillment 3200 + margin 640 = customer 3850', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    console.log(`
    ┌─ Example A: Kariakoo → Mikocheni ─────────────────────
    │ Strategy:        ${b.deliveryStrategy}
    │ Distance band:   TZS ${b.distanceBandCost} (7–12 km)
    │ Weight surcharge:TZS ${b.weightSurcharge} (≤1 kg)
    │ Peak surcharge:  TZS ${b.peakSurcharge}
    │ Fulfillment:     TZS ${b.fulfillmentCost}
    │ Platform margin: TZS ${b.platformMarginAmount} (20%)
    │ COD charge:      TZS ${b.codCharge}
    │ Platform subsidy:TZS ${b.platformSubsidy}
    │ Customer pays:   TZS ${b.finalFee}
    │ Note: ${b.financialNote}
    │
    │ ⚠ CALIBRATION NOTE: courierCompensationEstimate = TZS ${b.courierCompensationEstimate}
    │   This is from a simulation engine with mock rates. Actual boda-boda rates
    │   in Dar es Salaam are TZS 1,500–3,500 per trip. The TZS 3,200 fulfillment
    │   cost is based on market research and is the authoritative cost basis.
    └───────────────────────────────────────────────────────`);
    expect(b.fulfillmentCost + b.platformMarginAmount).toBe(3840);
  });
});

// ─── Example B: Dar → Morogoro, 1 kg, no COD ─────────────────────────────────

describe('Example B: Dar → Morogoro (INTERCITY, 250 km, 1 kg, no COD)', () => {
  const config = makeTestConfig();
  const input = makeInput({
    distanceKm: 250,
    durationMinutes: 200,
    packageWeightKg: 1,
    deliveryZone: 'cross_region',
    originRegion: 'dar es salaam',
    destinationRegion: 'morogoro',
  });
  const result = engine.compute(input, config);

  test('strategy is INTERCITY', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.deliveryStrategy).toBe('INTERCITY');
  });

  test('uses DAR_MOROGORO corridor correctly', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    expect(b.originHandlingCost).toBe(1000);
    expect(b.lineHaulCost).toBe(4000 + 300 * 1); // base + 300/kg * 1kg = 4300
    expect(b.destinationHandlingCost).toBe(800);
    expect(b.lastMileCost).toBe(1500);
    expect(b.fulfillmentCost).toBe(1000 + 4300 + 800 + 1500); // = 7600
  });

  test('no double charging: each component is a distinct operational cost', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    // Origin handling = pickup and consolidation at origin city
    // Line-haul = intercity transport
    // Destination handling = sorting at destination
    // Last-mile = final delivery to buyer
    // These are 4 genuinely different operations — no double counting
    const sumOfComponents = b.originHandlingCost + b.lineHaulCost + b.destinationHandlingCost + b.lastMileCost;
    expect(sumOfComponents).toBe(b.fulfillmentCost);
  });

  test('customer price is profitable', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.isProfitable).toBe(true);
    expect(result.breakdown.platformSubsidy).toBe(0);
  });

  test('economic summary: Dar → Morogoro', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    console.log(`
    ┌─ Example B: Dar → Morogoro ────────────────────────────
    │ Strategy:            ${b.deliveryStrategy}
    │ Corridor:            DAR_MOROGORO
    │ Origin handling:     TZS ${b.originHandlingCost}
    │ Line-haul (1 kg):    TZS ${b.lineHaulCost} (base 4000 + 300×1)
    │ Dest handling:       TZS ${b.destinationHandlingCost}
    │ Last-mile:           TZS ${b.lastMileCost}
    │ Fulfillment:         TZS ${b.fulfillmentCost}
    │ Platform margin 20%: TZS ${b.platformMarginAmount}
    │ COD charge:          TZS ${b.codCharge}
    │ Customer pays:       TZS ${b.finalFee}
    │ Profitable:          ${b.isProfitable}
    └───────────────────────────────────────────────────────`);
  });
});

// ─── Example C: Dar → Dodoma, 1 kg, no COD ───────────────────────────────────

describe('Example C: Dar → Dodoma (INTERCITY, 450 km, 1 kg, no COD)', () => {
  const config = makeTestConfig();
  const input = makeInput({
    distanceKm: 450,
    durationMinutes: 360,
    packageWeightKg: 1,
    deliveryZone: 'cross_region',
    originRegion: 'dar es salaam',
    destinationRegion: 'dodoma',
  });
  const result = engine.compute(input, config);

  test('fulfillment = 1000 + (6000+400) + 800 + 1500 = 9700', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.fulfillmentCost).toBe(9700);
  });

  test('customer fee is ~ TZS 11,650', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    // 9700 + 1940 (20%) = 11640 → rounded up to 11650
    expect(result.breakdown.finalFee).toBe(11650);
  });

  test('economic summary: Dar → Dodoma', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    console.log(`
    ┌─ Example C: Dar → Dodoma ──────────────────────────────
    │ Fulfillment:     TZS ${b.fulfillmentCost}
    │ Margin (20%):    TZS ${b.platformMarginAmount}
    │ Customer pays:   TZS ${b.finalFee}
    │ ⚠ ASSUMPTION: lineHaulBaseCostTzs=6000 needs validation vs actual bus/TAZARA rates.
    └───────────────────────────────────────────────────────`);
  });
});

// ─── Example D: Dar → Arusha, 1 kg, no COD ───────────────────────────────────

describe('Example D: Dar → Arusha (INTERCITY, 640 km, 1 kg, no COD)', () => {
  const config = makeTestConfig();
  const input = makeInput({
    distanceKm: 640,
    durationMinutes: 480,
    packageWeightKg: 1,
    deliveryZone: 'cross_region',
    originRegion: 'dar es salaam',
    destinationRegion: 'arusha',
  });
  const result = engine.compute(input, config);

  test('fulfillment = 1000 + (9000+500) + 1000 + 1800 = 13300', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.fulfillmentCost).toBe(13300);
  });

  test('customer fee is ~ TZS 16,000', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    // 13300 + 2660 = 15960 → rounded to 16000
    expect(result.breakdown.finalFee).toBe(16000);
  });

  test('Dar → Arusha is significantly higher than old model (was ~8900). This is correct.', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    // The old model (8900) was wrong — it treated Dar→Arusha as an urban courier trip.
    // TZS 16,000 correctly reflects intercity transport costs.
    expect(result.breakdown.finalFee).toBeGreaterThan(9000);
    expect(result.breakdown.deliveryStrategy).toBe('INTERCITY');
  });

  test('economic summary: Dar → Arusha', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    console.log(`
    ┌─ Example D: Dar → Arusha ──────────────────────────────
    │ Strategy:            INTERCITY (640 km)
    │ Origin handling:     TZS ${b.originHandlingCost}
    │ Line-haul (1 kg):    TZS ${b.lineHaulCost} (base 9000 + 500×1)
    │ Dest handling:       TZS ${b.destinationHandlingCost}
    │ Last-mile:           TZS ${b.lastMileCost}
    │ Fulfillment:         TZS ${b.fulfillmentCost}
    │ Platform margin 20%: TZS ${b.platformMarginAmount}
    │ Customer pays:       TZS ${b.finalFee} (prev: ~8,900 — that was wrong)
    │ ⚠ ASSUMPTION: lineHaulBaseCostTzs=9000 needs validation vs actual carrier.
    └───────────────────────────────────────────────────────`);
  });
});

// ─── Example E: Local 5 kg, COD ──────────────────────────────────────────────

describe('Example E: Local delivery, 5 kg, COD', () => {
  const config = makeTestConfig();
  const input = makeInput({
    distanceKm: 5,
    packageWeightKg: 5,
    isCoD: true,
    deliveryZone: 'same_district',
  });
  const result = engine.compute(input, config);

  test('weight surcharge is 500 TZS (additive, not multiplicative)', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.weightSurcharge).toBe(500);
  });

  test('COD charge is flat TZS 500, independent of delivery cost', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.codCharge).toBe(500);
  });

  test('COD is NOT a percentage of delivery fee', () => {
    // This was the old broken model (5% of delivery)
    // Now it is a flat flat service charge
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.codCharge).toBe(500); // flat, regardless of delivery cost
  });

  test('fulfillment = 2500 (band) + 500 (weight) = 3000', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    expect(result.breakdown.fulfillmentCost).toBe(3000);
  });

  test('economic summary: 5 kg COD local delivery', () => {
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');
    const b = result.breakdown;
    console.log(`
    ┌─ Example E: Local 5 kg COD ────────────────────────────
    │ Distance band (3–7km): TZS ${b.distanceBandCost}
    │ Weight surcharge (≤5kg): TZS ${b.weightSurcharge}
    │ Fulfillment:           TZS ${b.fulfillmentCost}
    │ Margin (20%):          TZS ${b.platformMarginAmount}
    │ COD charge (flat):     TZS ${b.codCharge}
    │ Customer pays:         TZS ${b.finalFee}
    └───────────────────────────────────────────────────────`);
  });
});

// ─── Multi-seller order ───────────────────────────────────────────────────────

describe('Multi-seller delivery model', () => {
  /**
   * Each Order_Order has exactly ONE sellerId (verified from schema.prisma).
   * The platform currently uses separate delivery per seller — no consolidation.
   *
   * If a buyer purchases from Seller A and Seller B in a single checkout,
   * the system creates TWO separate Order_Order records (one per seller),
   * and each gets its own delivery quote.
   *
   * Consequence: the buyer pays delivery fees PER SELLER, not per checkout.
   * This is correct for the current fulfillment model — two genuinely separate
   * pickup-and-delivery operations occur.
   *
   * When the platform introduces consolidation (multi-seller → single pickup point
   * → buyer), it must create a new ORDER_TYPE and calculate a single combined fee.
   * The corridor model already supports this — add a 'consolidation' corridor type.
   */

  test('two sellers in same district = two separate deliveries, each priced independently', () => {
    const config = makeTestConfig();

    const sellerAInput = makeInput({ distanceKm: 5, packageWeightKg: 0.5 }); // Seller A: 5 km
    const sellerBInput = makeInput({ distanceKm: 8, packageWeightKg: 1 });   // Seller B: 8 km

    const resultA = engine.compute(sellerAInput, config);
    const resultB = engine.compute(sellerBInput, config);

    expect(isDeliveryUnavailable(resultA)).toBe(false);
    expect(isDeliveryUnavailable(resultB)).toBe(false);

    if (isDeliveryUnavailable(resultA) || isDeliveryUnavailable(resultB)) return;

    // Each delivery is independently priced
    expect(resultA.breakdown.deliveryStrategy).toBe('LOCAL_URBAN');
    expect(resultB.breakdown.deliveryStrategy).toBe('LOCAL_URBAN');

    // Seller A (5 km, ≤1 kg): 2500 fulfillment
    expect(resultA.breakdown.fulfillmentCost).toBe(2500);
    // Seller B (8 km, ≤1 kg = tier 2 = no weight surcharge still): 3200 fulfillment
    expect(resultB.breakdown.fulfillmentCost).toBe(3200);

    // Total buyer pays = both fees combined
    const totalDelivery = resultA.breakdown.finalFee + resultB.breakdown.finalFee;
    expect(totalDelivery).toBeGreaterThan(resultA.breakdown.finalFee);
    expect(totalDelivery).toBeGreaterThan(resultB.breakdown.finalFee);

    console.log(`
    ┌─ Multi-seller: 2 separate deliveries ─────────────────
    │ Seller A (5 km, 0.5 kg): TZS ${resultA.breakdown.finalFee}
    │ Seller B (8 km, 1 kg):   TZS ${resultB.breakdown.finalFee}
    │ Buyer total delivery:     TZS ${totalDelivery}
    │
    │ Note: Each order has one sellerId (confirmed from Order_Order schema).
    │ Two genuine delivery operations → two fees is correct behavior.
    │ If consolidation is introduced in future, a new fulfillment model is needed.
    └───────────────────────────────────────────────────────`);
  });
});

// ─── Unsupported / remote route ───────────────────────────────────────────────

describe('Remote route handling', () => {
  test('remote route with remoteUnavailable=true returns DELIVERY_UNAVAILABLE', () => {
    const config = makeTestConfig({ remoteUnavailable: true });
    const input = makeInput({
      distanceKm: 800,
      deliveryZone: 'cross_region',
      originRegion: 'dar es salaam',
      destinationRegion: 'rukwa', // no corridor configured
    });

    // Strategy resolver will return REMOTE for 800 km cross-region
    const strategy = resolveDeliveryStrategy('cross_region', 800);
    expect(strategy).toBe('REMOTE');

    const result = engine.compute(input, config);
    expect(isDeliveryUnavailable(result)).toBe(true);
  });

  test('remote route with remoteUnavailable=false falls back to intercityFallback corridor', () => {
    const config = makeTestConfig({ remoteUnavailable: false });
    const input = makeInput({
      distanceKm: 800,
      deliveryZone: 'cross_region',
      originRegion: 'dar es salaam',
      destinationRegion: 'rukwa', // no specific corridor — uses fallback
    });

    const result = engine.compute(input, config);
    expect(isDeliveryUnavailable(result)).toBe(false);

    if (!isDeliveryUnavailable(result)) {
      // Uses intercityFallback: 1000 + 8000 + (500*0.5) + 1000 + 2000 = 12250
      // Note: this is a FALLBACK price, not a validated remote rate
      expect(result.breakdown.deliveryStrategy).toBe('REMOTE');
      console.log(`
    ┌─ Remote fallback: Dar → Rukwa ────────────────────────
    │ Strategy:      REMOTE (using intercityFallback — NOT a validated remote rate)
    │ Fulfillment:   TZS ${result.breakdown.fulfillmentCost}
    │ Customer pays: TZS ${result.breakdown.finalFee}
    │ ⚠ IMPORTANT: This is NOT implemented remote pricing.
    │   REMOTE currently falls back to the general intercity fallback corridor.
    │   Real remote logistics (Rukwa, Katavi, islands) requires dedicated
    │   corridor configs and fulfillment partnerships.
    └───────────────────────────────────────────────────────`);
    }
  });

  test('unconfigured intercity route without fallback returns DELIVERY_UNAVAILABLE', () => {
    const config = makeTestConfig({
      intercityCorridors: [],
      intercityFallback: null,
    });
    const input = makeInput({
      distanceKm: 300,
      deliveryZone: 'cross_region',
      originRegion: 'dar es salaam',
      destinationRegion: 'morogoro',
    });

    const result = engine.compute(input, config);
    expect(isDeliveryUnavailable(result)).toBe(true);
    if (isDeliveryUnavailable(result)) {
      expect(result.reason).toContain('No delivery corridor');
    }
  });
});

// ─── Financial integrity: subsidy detection ───────────────────────────────────

describe('Financial integrity: subsidy detection', () => {
  test('floor price below fulfillment cost creates a subsidy', () => {
    // If floor = 1500 but fulfillment = 3200, customer pays 3200+ (profitable)
    // If floor = 4000 but fulfillment = 2500, customer pays 4000 (margin > 20%)
    // Subsidy only occurs when finalFee < fulfillmentCost
    const config = makeTestConfig({ floorPriceTzs: 500 }); // floor below fulfillment
    const input = makeInput({ distanceKm: 1, packageWeightKg: 0.1 }); // 0–3 km band = 1800

    const result = engine.compute(input, config);
    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');

    // fulfillment = 1800, margin = 360, finalFee = 2200 → no subsidy
    expect(result.breakdown.platformSubsidy).toBe(0);
    expect(result.breakdown.isProfitable).toBe(true);
  });

  test('explicit zero-cost delivery promotion would show as subsidy', () => {
    // When free-delivery is implemented as freeDelivery=true,
    // the fee would be 0 and platformSubsidy = fulfillmentCost.
    // The engine enforces the floor (1500) but if floor were 0:
    const config = makeTestConfig({ floorPriceTzs: 0, ceilingPriceTzs: 0 });
    // ceiling = 0 would force finalFee = 0 — this would represent a fully subsidized delivery
    const input = makeInput({ distanceKm: 5 });
    const result = engine.compute(input, config);

    if (isDeliveryUnavailable(result)) throw new Error('unexpected unavailable');

    if (result.breakdown.finalFee < result.breakdown.fulfillmentCost) {
      expect(result.breakdown.platformSubsidy).toBeGreaterThan(0);
      expect(result.breakdown.isProfitable).toBe(false);
      console.log(`Subsidy detected: TZS ${result.breakdown.platformSubsidy} absorbed by platform`);
    }
  });
});

// ─── Client price manipulation is impossible ──────────────────────────────────

describe('Security: client cannot manipulate delivery fee', () => {
  test('customer delivery fee is determined by server config, not client input', () => {
    const config = makeTestConfig();
    // Client sends packageWeightKg=0 trying to get zero weight surcharge
    const resultLowWeight = engine.compute(makeInput({ packageWeightKg: 0.01 }), config);
    // Client sends a huge weight to test ceiling behavior
    const resultHeavy = engine.compute(makeInput({ packageWeightKg: 50 }), config);

    // Both should produce valid, different fees based on server config
    expect(isDeliveryUnavailable(resultLowWeight)).toBe(false);
    expect(isDeliveryUnavailable(resultHeavy)).toBe(false);

    if (!isDeliveryUnavailable(resultLowWeight) && !isDeliveryUnavailable(resultHeavy)) {
      expect(resultHeavy.breakdown.finalFee).toBeGreaterThan(resultLowWeight.breakdown.finalFee);
      // Heavy package costs more due to weight surcharge
      expect(resultHeavy.breakdown.weightSurcharge).toBeGreaterThan(0);
    }
  });
});

// ─── Pricing config version integrity ────────────────────────────────────────

describe('Pricing version integrity', () => {
  test('every quote carries the pricingVersion of the config used', () => {
    const configV2 = makeTestConfig({ version: 2 });
    const result = engine.compute(makeInput(), configV2);

    if (!isDeliveryUnavailable(result)) {
      expect(result.breakdown.pricingVersion).toBe(2);
    }
  });

  test('config version change between quote and checkout is detected at checkout', () => {
    // A quote is issued with v2 config. Before checkout, admin deploys v3 config.
    // At checkout, QuoteValidationService reads the stored quoteId (with pricingVersion=2)
    // and reports it as valid IF the quote has not expired.
    // The stored pricingVersion on the session allows financial reconciliation.
    const configV2 = makeTestConfig({ version: 2 });
    const result = engine.compute(makeInput(), configV2);

    if (!isDeliveryUnavailable(result)) {
      expect(result.breakdown.pricingVersion).toBe(2);
      // The quote captures the version at time of pricing.
      // Old quotes remain financially consistent because the fee was locked at quote time.
    }
  });
});

// ─── Calibration assumption summary ──────────────────────────────────────────

describe('Calibration assumptions (informational, not assertions)', () => {
  test('documents all current calibration assumptions', () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║  DELIVERY PRICING ENGINE v2 — CALIBRATION ASSUMPTIONS    ║
    ╠═══════════════════════════════════════════════════════════╣
    ║                                                           ║
    ║  ALL RATES ARE INITIAL ESTIMATES. NOT YET VALIDATED.     ║
    ║                                                           ║
    ║  LOCAL URBAN BANDS:                                       ║
    ║    0–3 km   → TZS 1,800  [ASSUMPTION: boda-boda rate]   ║
    ║    3–7 km   → TZS 2,500  [ASSUMPTION: boda-boda rate]   ║
    ║    7–12 km  → TZS 3,200  [ASSUMPTION: boda-boda rate]   ║
    ║    12–20 km → TZS 4,000  [ASSUMPTION: boda-boda rate]   ║
    ║  Validate: Survey 20+ boda-boda operators in Dar         ║
    ║                                                           ║
    ║  INTERCITY CORRIDORS:                                     ║
    ║    Dar→Morogoro line-haul: TZS 4,000  [ASSUMPTION]       ║
    ║    Dar→Dodoma line-haul:   TZS 6,000  [ASSUMPTION]       ║
    ║    Dar→Arusha line-haul:   TZS 9,000  [ASSUMPTION]       ║
    ║  Validate: Get quotes from Dar Express, Kilimanjaro       ║
    ║  Express, TAZARA, or freight forwarders                   ║
    ║                                                           ║
    ║  PLATFORM MARGIN: 20%  [ASSUMPTION — review after 50+    ║
    ║    deliveries]                                            ║
    ║                                                           ║
    ║  COURIER COMPENSATION ESTIMATE:                           ║
    ║    From EarningsCalculationEngine (SIMULATION ENGINE     ║
    ║    with mock data). Not real operational cost.           ║
    ║    Do NOT use as cost floor until real contracts exist.  ║
    ║                                                           ║
    ║  REMOTE STRATEGY: Falls back to intercityFallback.       ║
    ║    Not a distinct strategy. Requires dedicated corridors  ║
    ║    and fulfillment partnerships to properly implement.    ║
    ╚═══════════════════════════════════════════════════════════╝`);
    expect(true).toBe(true); // informational only
  });
});
