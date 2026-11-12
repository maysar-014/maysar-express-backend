import { SellerLocation } from '../entities/seller-location.entity';

export interface ISellerLocationRepository {
  // Locations
  save(location: SellerLocation): Promise<void>;
  findById(id: string): Promise<SellerLocation | null>;
  findBySeller(sellerId: string): Promise<SellerLocation[]>;
  findPrimaryForSeller(sellerId: string): Promise<SellerLocation | null>;
  clearPrimaryForSeller(sellerId: string): Promise<void>;
  delete(id: string): Promise<void>;

  // ── Geographic hierarchy (frontend-provided reference data) ──
  findRegions(countryId?: string): Promise<{ id: string; code: string; name: string }[]>;
  findDistricts(regionId: string): Promise<{ id: string; code: string; name: string }[]>;
  findWards(districtId: string): Promise<{ id: string; code: string; name: string }[]>;
  findStreets(wardId: string): Promise<{ id: string; code: string; name: string }[]>;
  validateGeographyIds(ids: {
    countryId?: string;
    regionId?: string;
    districtId?: string;
    wardId?: string;
    streetId?: string;
  }): Promise<boolean>;
  findRegionCode(regionId: string): Promise<string | null>;

  // ── Location search ──────────────────────────────────────────────────────
  searchLocations(
    sellerId: string,
    opts: {
      query?: string;
      type?: string;
      status?: string;
      isActive?: boolean;
      regionId?: string;
      districtId?: string;
      wardId?: string;
      streetId?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ locations: SellerLocation[]; total: number }>;
}
