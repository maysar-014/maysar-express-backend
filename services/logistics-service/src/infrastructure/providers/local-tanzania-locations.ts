import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

interface NationalLocationData {
  country: {
    code: string;
    name: string;
  };
  regions: Array<{
    code: number;
    name: string;
    lat?: number;
    lng?: number;
    districts: Array<{
      code: number;
      name: string;
      lat?: number;
      lng?: number;
      wards: Array<{
        code: number;
        name: string;
        lat?: number;
        lng?: number;
      }>;
    }>;
  }>;
}

export interface LocalLocationMatch {
  kind: 'region' | 'district' | 'ward';
  code: number;
  name: string;
  lat: number;
  lng: number;
  regionName?: string;
  districtName?: string;
}

const normalizeText = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export class TanzaniaLocationIndex {
  private readonly locations: LocalLocationMatch[];

  constructor(data: NationalLocationData) {
    this.locations = this.flatten(data);
  }

  get size(): number {
    return this.locations.length;
  }

  resolveAddress(address: string): LocalLocationMatch | null {
    const normalizedAddress = normalizeText(address);
    if (!normalizedAddress) {
      return null;
    }

    let bestMatch: LocalLocationMatch | null = null;
    let bestScore = 0;

    for (const location of this.locations) {
      const normalizedName = normalizeText(location.name);
      let score = 0;

      if (normalizedAddress === normalizedName) {
        score = 100;
      } else if (normalizedAddress.includes(normalizedName)) {
        score = 80 + Math.min(19, normalizedName.length);
      } else if (normalizedName.includes(normalizedAddress)) {
        score = 70 + Math.min(19, normalizedAddress.length);
      } else {
        const tokens = normalizedName.split(' ');
        score = tokens.reduce((total, token) => total + (normalizedAddress.includes(token) ? 8 : 0), 0);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = location;
      }
    }

    return bestScore >= 20 ? bestMatch : null;
  }

  findNearest(point: GeoPoint): LocalLocationMatch | null {
    if (this.locations.length === 0) {
      return null;
    }

    let nearestLocation: LocalLocationMatch = this.locations[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const location of this.locations) {
      const candidate = GeoPoint.create(location.lat, location.lng, location.name);
      const distance = point.distanceTo(candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLocation = location;
      }
    }

    return nearestLocation;
  }

  infer(point: GeoPoint): LocalLocationMatch | null {
    const exactMatch = this.resolveAddress(point.getAddress());
    if (exactMatch) {
      return exactMatch;
    }
    return this.findNearest(point);
  }

  private flatten(data: NationalLocationData): LocalLocationMatch[] {
    const flattened: LocalLocationMatch[] = [];

    for (const region of data.regions ?? []) {
      if (typeof region.lat === 'number' && typeof region.lng === 'number') {
        flattened.push({
          kind: 'region',
          code: region.code,
          name: region.name,
          lat: region.lat,
          lng: region.lng
        });
      }

      for (const district of region.districts ?? []) {
        if (typeof district.lat === 'number' && typeof district.lng === 'number') {
          flattened.push({
            kind: 'district',
            code: district.code,
            name: district.name,
            lat: district.lat,
            lng: district.lng,
            regionName: region.name
          });
        }

        for (const ward of district.wards ?? []) {
          if (typeof ward.lat === 'number' && typeof ward.lng === 'number') {
            flattened.push({
              kind: 'ward',
              code: ward.code,
              name: ward.name,
              lat: ward.lat,
              lng: ward.lng,
              regionName: region.name,
              districtName: district.name
            });
          }
        }
      }
    }

    return flattened;
  }
}

let cachedIndex: TanzaniaLocationIndex | null = null;

export function getTanzaniaLocationIndex(): TanzaniaLocationIndex {
  if (!cachedIndex) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data: NationalLocationData = require('../../../../../locations/tanzania_national.json');
    cachedIndex = new TanzaniaLocationIndex(data);
  }

  return cachedIndex;
}

export function getLocalitySummary(point: GeoPoint): {
  nearest: LocalLocationMatch | null;
  regionName: string | null;
  districtName: string | null;
  wardName: string | null;
} {
  const match = getTanzaniaLocationIndex().infer(point);
  return {
    nearest: match,
    regionName: match?.regionName ?? (match?.kind === 'region' ? match.name : null),
    districtName: match?.districtName ?? (match?.kind === 'district' ? match.name : null),
    wardName: match?.kind === 'ward' ? match.name : null
  };
}
