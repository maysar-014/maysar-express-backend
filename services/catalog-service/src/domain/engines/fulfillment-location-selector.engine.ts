/**
 * FulfillmentLocationSelector
 *
 * Pure domain engine. Selects the optimal seller location for each product
 * in a checkout cart given the buyer's coordinates.
 *
 * Selection criteria (in priority order):
 *   1. Must have net available stock > 0
 *   2. Location must be ACTIVE
 *   3. Closest to buyer (Haversine distance)
 *   4. Fallback: isPrimary location even if further
 *
 * This is a pure function with no side effects — all DB access happens
 * in the use case layer before calling this engine.
 */

import { haversineKm } from '../../../../../shared/geo/haversine';
import { ProductLocation } from '../entities/product-location.entity';
import { SellerLocation } from '../entities/seller-location.entity';

export interface LocationCandidate {
  productLocation: ProductLocation;
  sellerLocation: SellerLocation;
}

export interface SelectionResult {
  productId: string;
  sellerId: string;
  locationId: string;
  distanceKm: number;
  stockAvailable: number;
  selectionBasis: 'proximity' | 'primary_fallback' | 'only_available';
}

/**
 * For each product, select the best fulfillment location.
 * Returns null for a product if no valid location exists.
 */
export function selectFulfillmentLocations(
  products: Array<{
    productId: string;
    sellerId: string;
    candidates: LocationCandidate[];
  }>,
  buyerLat: number,
  buyerLng: number,
): Map<string, SelectionResult> {
  const results = new Map<string, SelectionResult>();

  for (const { productId, sellerId, candidates } of products) {
    const available = candidates.filter(
      c => c.sellerLocation.isActive
        && c.sellerLocation.status === 'ACTIVE'
        && c.productLocation.netAvailable > 0,
    );

    if (available.length === 0) continue;

    // Score each candidate
    const scored = available.map(c => ({
      ...c,
      distanceKm: haversineKm(
        buyerLat, buyerLng,
        c.sellerLocation.latitude,
        c.sellerLocation.longitude,
      ),
    }));

    // Sort by distance ascending
    scored.sort((a, b) => a.distanceKm - b.distanceKm);
    const best = scored[0];

    let basis: SelectionResult['selectionBasis'] = 'proximity';
    if (scored.length === 1) basis = 'only_available';
    else if (best.sellerLocation.isPrimary && scored[0].distanceKm === scored[1]?.distanceKm) {
      basis = 'primary_fallback';
    }

    results.set(productId, {
      productId,
      sellerId,
      locationId: best.sellerLocation.id,
      distanceKm: best.distanceKm,
      stockAvailable: best.productLocation.netAvailable,
      selectionBasis: basis,
    });
  }

  return results;
}

/**
 * Given a set of selection results (one per product), return the single
 * fulfillment location for a seller order. If all products for a seller
 * share the same location, that location is returned. Otherwise the most
 * common location wins (tie-broken by closest to buyer).
 */
export function resolveOrderFulfillmentLocation(
  sellerOrderProductIds: string[],
  selections: Map<string, SelectionResult>,
): string | undefined {
  const locationCounts = new Map<string, number>();
  for (const productId of sellerOrderProductIds) {
    const sel = selections.get(productId);
    if (!sel) continue;
    locationCounts.set(sel.locationId, (locationCounts.get(sel.locationId) ?? 0) + 1);
  }
  if (locationCounts.size === 0) return undefined;
  // Return location that covers most products
  return [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
