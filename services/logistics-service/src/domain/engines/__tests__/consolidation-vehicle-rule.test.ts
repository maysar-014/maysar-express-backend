/**
 * Consolidation vehicle-capability eligibility tests (Phase 2 §2.3)
 */

import { consolidate, canConsolidateVehicleClasses, SellerPickupInput, ConsolidationConfig } from '../consolidation.engine';
import { GeoPoint } from '../../value-objects/geopoint.value-object';

const BUYER = GeoPoint.create(-6.7924, 39.2083, 'City centre, Dar es Salaam');

const CONFIG: ConsolidationConfig = {
  consolidationRadiusKm: 5.0,
  maxConsolidatedRouteOverheadPct: 1.4,
  maxGroupWeightKg: 20.0,
  allocationAlgorithm: 'weight_proportional',
};

function seller(
  index: number,
  lat: number,
  lng: number,
  requiredVehicleClass?: 'MOTORCYCLE' | 'PICKUP' | 'VAN' | 'TRUCK',
): SellerPickupInput {
  return {
    sellerOrderId: `ord_${index}`,
    sellerId: `seller-${index}`,
    pickupPoint: GeoPoint.create(lat, lng, 'pickup'),
    packageWeightKg: 1,
    // Individual distance must exceed the two-pickup haversine path so the
    // 1.4× route-overhead check passes and the vehicle rule is what is tested.
    individualRouteDistanceKm: 10,
    requiredVehicleClass,
  };
}

describe('canConsolidateVehicleClasses', () => {
  it('allows unconstrained members to mix freely', () => {
    expect(canConsolidateVehicleClasses([null, null, 'MOTORCYCLE', null])).toBe(true);
    expect(canConsolidateVehicleClasses([])).toBe(true);
  });

  it('allows members sharing a single explicit requirement', () => {
    expect(canConsolidateVehicleClasses(['MOTORCYCLE', 'MOTORCYCLE', null])).toBe(true);
    expect(canConsolidateVehicleClasses(['VAN', 'VAN'])).toBe(true);
  });

  it('rejects two different explicit requirements', () => {
    expect(canConsolidateVehicleClasses(['MOTORCYCLE', 'VAN'])).toBe(false);
    expect(canConsolidateVehicleClasses(['MOTORCYCLE', null, 'TRUCK'])).toBe(false);
  });
});

describe('consolidate() — vehicle capability rule', () => {
  it('consolidates two nearby sellers that both require MOTORCYCLE', () => {
    const plans = consolidate(
      [seller(1, -6.77, 39.27, 'MOTORCYCLE'), seller(2, -6.78, 39.28, 'MOTORCYCLE')],
      BUYER,
      CONFIG,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].consolidationBenefit).toBe('CONSOLIDATED');
    expect(plans[0].sellerOrderIds).toHaveLength(2);
  });

  it('does NOT consolidate a MOTORCYCLE-required with a VAN-required seller', () => {
    const plans = consolidate(
      [seller(1, -6.77, 39.27, 'MOTORCYCLE'), seller(2, -6.78, 39.28, 'VAN')],
      BUYER,
      CONFIG,
    );
    expect(plans).toHaveLength(2);
    expect(plans.every(p => p.consolidationBenefit === 'SINGLETON')).toBe(true);
  });

  it('keeps an unconstrained seller compatible with a tagged group', () => {
    const plans = consolidate(
      [seller(1, -6.77, 39.27, 'PICKUP'), seller(2, -6.78, 39.28)],
      BUYER,
      CONFIG,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].sellerOrderIds).toHaveLength(2);
  });
});