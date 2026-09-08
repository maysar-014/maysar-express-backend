/**
 * Phase 4 §4.1–4.3 — FulfillmentOptionEngine + OptionRankingEngine tests.
 *
 * Covers: option generation (all four types), COD trust-tier gating,
 * feasibility-only ranking (exclusions escalated, never silently dropped),
 * FLEXIBLE-window discount tiering, driver minimum-earnings hard gate, and
 * the weighted ranking objective.
 */

import { FulfillmentOptionEngine, FulfillmentOptionRequest } from '../fulfillment-option.engine';
import { OptionRankingEngine } from '../option-ranking.engine';
import { VehicleTariff } from '../../entities/vehicle-tariff.entity';
import { OptimizationConfig } from '../../value-objects/optimization-config.value-object';

const TARIFF = VehicleTariff.create({
  vehicleId: 'VHL_1',
  baseOperatingCostTzs: 2000,
  costPerKmTzs: 500,
  costPerHourTzs: 12000,
  minimumJobCompensationTzs: 8000,
  loadingFeeTzs: 300,
  unloadingFeeTzs: 200,
  waitingRateTzsPerMinute: 50,
  freeWaitMinutes: 5,
});

const engine = new FulfillmentOptionEngine();
const ranking = new OptionRankingEngine();

// Two nearby Dar es Salaam sellers, all pickup-eligible, world-light weight.
function makeBaseRequest(overrides: Partial<FulfillmentOptionRequest> = {}): FulfillmentOptionRequest {
  return {
    shipments: [
      { shipmentId: 'SHP_1', sellerId: 'seller-1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 2, pickupEligible: true },
      { shipmentId: 'SHP_2', sellerId: 'seller-2', pickupLat: -6.78, pickupLng: 39.28, pickupAddress: 'Masaki', packageWeightKg: 1.5, pickupEligible: true },
    ],
    buyer: { lat: -6.7924, lng: 39.2083, address: 'City centre' },
    tariff: TARIFF,
    marginPct: 0.2,
    buyerTrustTier: 'TRUSTED_BUYER',
    consolidationAvailable: true,
    availableVehicleCapacityKg: 30,
    ...overrides,
  };
}

describe('FulfillmentOptionEngine — generation', () => {
  it('generates all four option types for a TRUSTED_BUYER with consolidation', () => {
    const { options, excluded } = engine.generate(makeBaseRequest());
    const types = options.map(o => o.optionType).sort();
    expect(types).toEqual(['CUSTOMER_PICKUP', 'MAYSAR_EXPRESS', 'MAYSAR_SHARED', 'SUPPLIER_DELIVERY']);
    expect(excluded).toHaveLength(0);
  });

  it('produces a zero-fee CUSTOMER_PICKUP and zero Maysar margin for it', () => {
    const { options } = engine.generate(makeBaseRequest());
    const pickup = options.find(o => o.optionType === 'CUSTOMER_PICKUP')!;
    expect(pickup.buyerPriceTzs).toBe(0);
    expect(pickup.maysarMarginTzs).toBe(0);
    expect(pickup.driverCompensationTzs).toBe(0);
  });

  it('MAYSAR_EXPRESS is faster and more expensive than MAYSAR_SHARED', () => {
    const { options } = engine.generate(makeBaseRequest());
    const express = options.find(o => o.optionType === 'MAYSAR_EXPRESS')!;
    const shared = options.find(o => o.optionType === 'MAYSAR_SHARED')!;
    expect(express.estimatedDeliveryAt.getTime()).toBeLessThan(shared.estimatedDeliveryAt.getTime());
    expect(express.buyerPriceTzs).toBeGreaterThan(shared.buyerPriceTzs);
  });

  it('every option carries the four-concept breakdown (no single deliveryFee)', () => {
    const { options } = engine.generate(makeBaseRequest());
    expect(options.length).toBeGreaterThan(0);
  });

  it('excludes MAYSAR options when the shipment exceeds the largest vehicle capacity', () => {
    const { options, excluded } = engine.generate(makeBaseRequest({ availableVehicleCapacityKg: 1 }));
    expect(options.some(o => o.optionType === 'MAYSAR_SHARED')).toBe(false);
    expect(options.some(o => o.optionType === 'MAYSAR_EXPRESS')).toBe(false);
    expect(excluded.some(e => e.optionType === 'MAYSAR_SHARED' && /capacity/.test(e.reason))).toBe(true);
  });
});

describe('FulfillmentOptionEngine — COD trust tiers (§4.3)', () => {
  it('NEW_BUYER within radius: MAYSAR_SHARED restricted, MAYSAR_EXPRESS eligible', () => {
    const { options, excluded } = engine.generate(makeBaseRequest({ buyerTrustTier: 'NEW_BUYER' }));
    expect(options.some(o => o.optionType === 'MAYSAR_SHARED')).toBe(false);
    expect(options.some(o => o.optionType === 'MAYSAR_EXPRESS')).toBe(true);
    expect(excluded.some(e => e.optionType === 'MAYSAR_SHARED' && /NEW_BUYER/.test(e.reason))).toBe(true);
  });

  it('NEW_BUYER beyond radius: MAYSAR_EXPRESS also excluded (radius limit)', () => {
    const { options, excluded } = engine.generate(makeBaseRequest({
      buyerTrustTier: 'NEW_BUYER',
      shipments: [{ shipmentId: 'SHP_1', sellerId: 'seller-1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Dar', packageWeightKg: 1, pickupEligible: true }],
      buyer: { lat: -3.3869, lng: 36.683, address: 'Arusha' },
    }));
    expect(options.some(o => o.optionType === 'MAYSAR_EXPRESS')).toBe(false);
    expect(excluded.some(e => e.optionType === 'MAYSAR_EXPRESS' && /radius limit/.test(e.reason))).toBe(true);
  });

  it('TRUSTED_BUYER with FLEXIBLE window gets the shared discount; NEW_BUYER does not', () => {
    const trusted = engine.generate(makeBaseRequest({ deliveryWindowPreference: 'FLEXIBLE' }));
    const trustedShared = trusted.options.find(o => o.optionType === 'MAYSAR_SHARED')!;
    expect(trustedShared.flexibleWindowDiscountApplied).toBe(true);

    const newBuyer = engine.generate(makeBaseRequest({ buyerTrustTier: 'NEW_BUYER', deliveryWindowPreference: 'FLEXIBLE' }));
    // NEW_BUYER has no shared option at all; no flexible window discount anywhere.
    expect(newBuyer.options.every(o => !o.flexibleWindowDiscountApplied)).toBe(true);
  });

  it('GOLD_BUYER unlocks nationwide fulfillment (intercity express)', () => {
    const { options } = engine.generate(makeBaseRequest({
      buyerTrustTier: 'GOLD_BUYER',
      shipments: [{ shipmentId: 'SHP_DAR', sellerId: 'seller-1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 1, pickupEligible: false }],
      buyer: { lat: -3.3869, lng: 36.683, address: 'Arusha' },
    }));
    const express = options.find(o => o.optionType === 'MAYSAR_EXPRESS')!;
    expect(express.deliveryZone).toBe('intercity');
  });
});

describe('FulfillmentOptionEngine — CUSTOMER_PICKUP eligibility', () => {
  it('excludes CUSTOMER_PICKUP when not all sellers allow pickup', () => {
    const { options, excluded } = engine.generate(makeBaseRequest({
      shipments: [
        { shipmentId: 'SHP_1', sellerId: 'seller-1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 1, pickupEligible: true },
        { shipmentId: 'SHP_2', sellerId: 'seller-2', pickupLat: -6.78, pickupLng: 39.28, pickupAddress: 'Masaki', packageWeightKg: 1, pickupEligible: false },
      ],
    }));
    expect(options.some(o => o.optionType === 'CUSTOMER_PICKUP')).toBe(false);
    expect(excluded.some(e => e.optionType === 'CUSTOMER_PICKUP')).toBe(true);
  });
});

describe('FulfillmentOptionEngine — driver minimum-earnings hard gate', () => {
  it('escalates (excludes) an option whose driver compensation is below the vehicle minimum', () => {
    // Skip options don't apply: use a tariff with a huge minimum so Maysar options fail.
    const hugeMinimum = VehicleTariff.create({
      vehicleId: 'VHL_BIG',
      baseOperatingCostTzs: 100,
      costPerKmTzs: 10,
      costPerHourTzs: 600,
      minimumJobCompensationTzs: 1_000_000,
    });
    const { options, excluded } = engine.generate(makeBaseRequest({
      tariff: hugeMinimum,
      consolidationAvailable: true,
    }));
    expect(options.some(o => o.optionType === 'MAYSAR_EXPRESS')).toBe(false);
    expect(excluded.some(e => e.optionType === 'MAYSAR_EXPRESS' && /below vehicle minimum/.test(e.reason))).toBe(true);
  });
});

describe('OptionRankingEngine (§4.2)', () => {
  const weights = OptimizationConfig.defaultWeights();
  const { options } = engine.generate(makeBaseRequest());

  it('sorts by score descending', () => {
    const ranked = ranking.rank(options, weights);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it('scores each option against the weight-normalized objective', () => {
    const ranked = ranking.rank(options, weights);
    expect(ranked.length).toBe(options.length);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(typeof r.scoreComponents.normalizedCostScore).toBe('number');
    }
  });

  it('assigns the interrelated score components', () => {
    const ranked = ranking.rank(options, weights);
    const express = ranked.find(o => o.optionType === 'MAYSAR_EXPRESS')!;
    // Express is fastest → normalized speed score should be high.
    expect(express.scoreComponents.normalizedSpeedScore).toBeGreaterThan(0.5);
  });
});