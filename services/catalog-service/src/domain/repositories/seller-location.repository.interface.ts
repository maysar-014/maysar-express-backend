import { SellerLocation } from '../entities/seller-location.entity';
import { ProductLocation } from '../entities/product-location.entity';

export interface ISellerLocationRepository {
  // Locations
  save(location: SellerLocation): Promise<void>;
  findById(id: string): Promise<SellerLocation | null>;
  findBySeller(sellerId: string): Promise<SellerLocation[]>;
  findPrimaryForSeller(sellerId: string): Promise<SellerLocation | null>;
  clearPrimaryForSeller(sellerId: string): Promise<void>;
  delete(id: string): Promise<void>;

  // Product inventory at locations
  saveProductLocation(pl: ProductLocation): Promise<void>;
  findProductLocation(productId: string, locationId: string): Promise<ProductLocation | null>;
  findProductLocations(productId: string): Promise<ProductLocation[]>;
  findLocationProducts(locationId: string): Promise<ProductLocation[]>;
  deleteProductLocation(productId: string, locationId: string): Promise<void>;

  /**
   * Returns locations for a product that have net available stock > 0,
   * ordered by distance from buyer (closest first).
   */
  findAvailableLocationsForProduct(
    productId: string,
    buyerLat: number,
    buyerLng: number,
  ): Promise<Array<ProductLocation & { distanceKm: number; location: SellerLocation }>>;
}
