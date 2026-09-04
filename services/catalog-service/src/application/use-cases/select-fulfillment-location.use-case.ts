/**
 * SelectFulfillmentLocationUseCase
 *
 * Called at checkout to determine the optimal seller location for each
 * product in the cart. Returns per-product location selections and
 * records the decision as an audit trail.
 *
 * Used by the checkout service to:
 *   1. Provide real pickup coordinates to the delivery engine
 *   2. Set fulfillmentLocationId on the seller order record
 *   3. Drive consolidation grouping by actual pickup point
 */

import { makeId } from '../../../../../shared/ids/id';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';
import {
  selectFulfillmentLocations,
  resolveOrderFulfillmentLocation,
  SelectionResult,
} from '../../domain/engines/fulfillment-location-selector.engine';

export interface FulfillmentSelectionRequest {
  checkoutId: string;
  buyerLat: number;
  buyerLng: number;
  /** productId → sellerId */
  products: Array<{ productId: string; sellerId: string }>;
}

export interface FulfillmentSelectionResponse {
  /** productId → selection result */
  byProduct: Map<string, SelectionResult>;
  /**
   * sellerId → resolved locationId for the seller order.
   * This is what gets written to Order.fulfillmentLocationId.
   */
  bySellerOrder: Map<string, string>;
}

export class SelectFulfillmentLocationUseCase {
  constructor(private readonly repo: ISellerLocationRepository) {}

  async execute(req: FulfillmentSelectionRequest): Promise<FulfillmentSelectionResponse> {
    const { checkoutId, buyerLat, buyerLng, products } = req;

    // Group products by seller
    const sellerProducts = new Map<string, string[]>();
    for (const { productId, sellerId } of products) {
      if (!sellerProducts.has(sellerId)) sellerProducts.set(sellerId, []);
      sellerProducts.get(sellerId)!.push(productId);
    }

    // Load candidates for all products in parallel
    const productInputs = await Promise.all(
      products.map(async ({ productId, sellerId }) => {
        const pls = await this.repo.findAvailableLocationsForProduct(productId, buyerLat, buyerLng);
        return {
          productId,
          sellerId,
          candidates: pls.map(pl => ({
            productLocation: pl,
            sellerLocation: pl.location,
          })),
        };
      }),
    );

    // Run pure selection engine
    const byProduct = selectFulfillmentLocations(productInputs, buyerLat, buyerLng);

    // Resolve per-seller order location
    const bySellerOrder = new Map<string, string>();
    for (const [sellerId, productIds] of sellerProducts) {
      const locationId = resolveOrderFulfillmentLocation(productIds, byProduct);
      if (locationId) bySellerOrder.set(sellerId, locationId);
    }

    // Persist audit (non-fatal)
    try {
      const prisma = (globalThis as any).prisma;
      if (prisma?.catalog_FulfillmentSelection) {
        await Promise.all(
          [...byProduct.values()].map(sel =>
            prisma.catalog_FulfillmentSelection.create({
              data: {
                id: makeId('fsel'),
                checkoutId,
                productId: sel.productId,
                sellerId: sel.sellerId,
                locationId: sel.locationId,
                selectionBasis: sel.selectionBasis,
                buyerLat,
                buyerLng,
                distanceKm: sel.distanceKm,
                stockAvailable: sel.stockAvailable,
              },
            }).catch(() => { /* non-fatal */ }),
          ),
        );
      }
    } catch { /* non-fatal */ }

    return { byProduct, bySellerOrder };
  }
}
