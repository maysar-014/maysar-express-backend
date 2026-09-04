/**
 * FulfillmentLocationSelector Engine Tests
 *
 * Property-based correctness properties:
 *   P1. If a seller has no available stock anywhere, no result is returned for that product
 *   P2. Selected location always has netAvailable > 0
 *   P3. Selected location is always the closest to the buyer among eligible ones
 *   P4. resolveOrderFulfillmentLocation returns the most-common locationId across products
 */

import {
  selectFulfillmentLocations,
  resolveOrderFulfillmentLocation,
  LocationCandidate,
} from '../fulfillment-location-selector.engine';
import { ProductLocation } from '../../entities/product-location.entity';
import { SellerLocation } from '../../entities/seller-location.entity';

function makeLocation(id: string, lat: number, lng: number, isPrimary = false): SellerLocation {
  return new SellerLocation({
    id,
    sellerId: 'seller_1',
    name: `Location ${id}`,
    type: 'SHOP',
    status: 'ACTIVE',
    address: { street: 'Test St', region: 'Dar es Salaam', country: 'Tanzania' },
    latitude: lat,
    longitude: lng,
    isPrimary,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeProductLocation(locationId: string, qty: number, reserved = 0): ProductLocation {
  return new ProductLocation({
    id: `pl_${locationId}`,
    productId: 'prod_1',
    locationId,
    sellerId: 'seller_1',
    quantityAvailable: qty,
    quantityReserved: reserved,
    isAvailable: qty > 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const BUYER_LAT = -6.7924; // Dar es Salaam centre
const BUYER_LNG = 39.2083;

describe('selectFulfillmentLocations', () => {
  it('P1: returns no result when no locations have available stock', () => {
    const candidates: LocationCandidate[] = [
      { productLocation: makeProductLocation('loc1', 0), sellerLocation: makeLocation('loc1', -6.8, 39.2) },
      { productLocation: makeProductLocation('loc2', 5, 5), sellerLocation: makeLocation('loc2', -6.81, 39.21) }, // reserved = available
    ];
    const result = selectFulfillmentLocations(
      [{ productId: 'prod_1', sellerId: 'seller_1', candidates }],
      BUYER_LAT, BUYER_LNG,
    );
    expect(result.size).toBe(0);
  });

  it('P2: selected location always has netAvailable > 0', () => {
    const loc1 = makeLocation('loc1', -6.8, 39.2);
    const loc2 = makeLocation('loc2', -6.9, 39.3);
    const candidates: LocationCandidate[] = [
      { productLocation: makeProductLocation('loc1', 10, 2), sellerLocation: loc1 },
      { productLocation: makeProductLocation('loc2', 3, 0), sellerLocation: loc2 },
    ];
    const result = selectFulfillmentLocations(
      [{ productId: 'prod_1', sellerId: 'seller_1', candidates }],
      BUYER_LAT, BUYER_LNG,
    );
    const sel = result.get('prod_1')!;
    expect(sel).toBeDefined();
    expect(sel.stockAvailable).toBeGreaterThan(0);
  });

  it('P3: selects closest location to buyer', () => {
    // Kariakoo is ~1.5km from buyer; Mbagala is ~12km
    const kariakoo = makeLocation('kariakoo', -6.8167, 39.2833);  // ~1.5km from buyer
    const mbagala  = makeLocation('mbagala',  -6.8900, 39.2700);  // ~11km from buyer
    const candidates: LocationCandidate[] = [
      { productLocation: makeProductLocation('kariakoo', 5), sellerLocation: kariakoo },
      { productLocation: makeProductLocation('mbagala', 10), sellerLocation: mbagala },
    ];
    const result = selectFulfillmentLocations(
      [{ productId: 'prod_1', sellerId: 'seller_1', candidates }],
      BUYER_LAT, BUYER_LNG,
    );
    const sel = result.get('prod_1')!;
    expect(sel.locationId).toBe('kariakoo');
  });

  it('skips INACTIVE locations', () => {
    const active   = makeLocation('active', -6.8, 39.2);
    const inactive = new SellerLocation({
      ...makeLocation('inactive', -6.79, 39.20),  // closer, but inactive
      status: 'INACTIVE' as any,
      isActive: false,
    } as any);

    const candidates: LocationCandidate[] = [
      { productLocation: makeProductLocation('active', 5), sellerLocation: active },
      { productLocation: makeProductLocation('inactive', 100), sellerLocation: inactive },
    ];
    const result = selectFulfillmentLocations(
      [{ productId: 'prod_1', sellerId: 'seller_1', candidates }],
      BUYER_LAT, BUYER_LNG,
    );
    expect(result.get('prod_1')?.locationId).toBe('active');
  });

  it('handles multiple products independently', () => {
    const locA = makeLocation('locA', -6.80, 39.20);
    const locB = makeLocation('locB', -6.85, 39.25);
    const result = selectFulfillmentLocations(
      [
        {
          productId: 'prod_1', sellerId: 'seller_1',
          candidates: [{ productLocation: makeProductLocation('locA', 5), sellerLocation: locA }],
        },
        {
          productId: 'prod_2', sellerId: 'seller_1',
          candidates: [{ productLocation: makeProductLocation('locB', 3), sellerLocation: locB }],
        },
      ],
      BUYER_LAT, BUYER_LNG,
    );
    expect(result.size).toBe(2);
    expect(result.get('prod_1')?.locationId).toBe('locA');
    expect(result.get('prod_2')?.locationId).toBe('locB');
  });
});

describe('resolveOrderFulfillmentLocation', () => {
  it('P4: returns the most common locationId', () => {
    const selections = new Map([
      ['prod_1', { productId: 'prod_1', sellerId: 's1', locationId: 'locA', distanceKm: 1, stockAvailable: 5, selectionBasis: 'proximity' as const }],
      ['prod_2', { productId: 'prod_2', sellerId: 's1', locationId: 'locA', distanceKm: 1, stockAvailable: 5, selectionBasis: 'proximity' as const }],
      ['prod_3', { productId: 'prod_3', sellerId: 's1', locationId: 'locB', distanceKm: 2, stockAvailable: 3, selectionBasis: 'proximity' as const }],
    ]);
    const result = resolveOrderFulfillmentLocation(['prod_1', 'prod_2', 'prod_3'], selections);
    expect(result).toBe('locA');  // locA appears twice
  });

  it('returns undefined when no selections exist', () => {
    const result = resolveOrderFulfillmentLocation(['prod_1'], new Map());
    expect(result).toBeUndefined();
  });
});
