/**
 * WardCentroidResolver
 *
 * Loads the Tanzania locations database at service startup and provides
 * O(1) ward centroid lookups by ward code. Used by EnhancedCODEligibilityEngine
 * to compute Haversine distances for geographic COD restrictions.
 *
 * Memory footprint: ~120 KB (3,054 ward entries × ~40 bytes each).
 * Load time: < 50ms (single synchronous JSON parse + iteration).
 */

export interface WardCentroid {
  lat: number;
  lng: number;
}

interface WardData {
  code: number;
  name: string;
  lat?: number;
  lng?: number;
  streets?: string[];
  places?: string[];
}

interface DistrictData {
  code: number;
  name: string;
  wards: WardData[];
}

interface RegionData {
  code: number;
  name: string;
  districts: DistrictData[];
}

export interface TanzaniaLocationData {
  country: { code: string; name: string };
  regions: RegionData[];
}

export class WardCentroidResolver {
  private readonly centroids: Map<number, WardCentroid>;

  constructor(data: TanzaniaLocationData) {
    this.centroids = this.buildMap(data);
  }

  /**
   * Resolve the centroid coordinates for a ward by its numeric code.
   * Returns null if the ward code is not found or has no coordinates.
   *
   * @param wardCode - Numeric ward code (e.g. 11101 for Kivukoni, Dar es Salaam)
   */
  resolveWardCentroid(wardCode: number): WardCentroid | null {
    return this.centroids.get(wardCode) ?? null;
  }

  /** Total number of wards with resolved coordinates. */
  get size(): number {
    return this.centroids.size;
  }

  private buildMap(data: TanzaniaLocationData): Map<number, WardCentroid> {
    const map = new Map<number, WardCentroid>();

    for (const region of data.regions ?? []) {
      for (const district of region.districts ?? []) {
        for (const ward of district.wards ?? []) {
          if (
            ward.code !== undefined &&
            ward.lat !== undefined &&
            ward.lng !== undefined
          ) {
            map.set(ward.code, { lat: ward.lat, lng: ward.lng });
          }
        }
      }
    }

    return map;
  }
}

/**
 * Factory function — loads tanzania_national.json once at service startup.
 * The resolver is intended to be registered as a singleton in the DI container.
 */
export function loadWardCentroidResolver(): WardCentroidResolver {
  // Path is relative to the compiled output location (dist/); adjust if needed.
  // In development the TypeScript source runs from services/order-service/src/,
  // so we walk up to the workspace root and into locations/.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data: TanzaniaLocationData = require('../../../../../locations/tanzania_national.json');
  return new WardCentroidResolver(data);
}
