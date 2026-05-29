/**
 * Geocoding Adapter
 *
 * Converts a human-readable address string to latitude/longitude coordinates.
 * Uses the Google Maps Geocoding API when GOOGLE_MAPS_API_KEY is configured,
 * falling back to a Tanzania-specific lookup table for common cities when the
 * API key is absent (development / test mode).
 */

import { GeocodingAdapter, GeocodeResult } from '../../application/use-cases/geocode-address.use-case';

// Tanzania city fallback table — used when no API key is configured
const TANZANIA_CITY_COORDS: Record<string, GeocodeResult> = {
  'dar es salaam':  { latitude: -6.7924,  longitude: 39.2083 },
  'kariakoo':       { latitude: -6.8161,  longitude: 39.2694 },
  'mikocheni':      { latitude: -6.7667,  longitude: 39.2333 },
  'arusha':         { latitude: -3.3869,  longitude: 36.6830 },
  'mwanza':         { latitude: -2.5164,  longitude: 32.9175 },
  'dodoma':         { latitude: -6.1722,  longitude: 35.7395 },
  'mbeya':          { latitude: -8.9000,  longitude: 33.4500 },
  'morogoro':       { latitude: -6.8242,  longitude: 37.6611 },
  'tanga':          { latitude: -5.0693,  longitude: 39.0986 },
  'zanzibar':       { latitude: -6.1659,  longitude: 39.2026 },
  'zanzibar city':  { latitude: -6.1659,  longitude: 39.2026 },
  'stone town':     { latitude: -6.1622,  longitude: 39.1921 },
  'iringa':         { latitude: -7.7700,  longitude: 35.6900 },
  'moshi':          { latitude: -3.3500,  longitude: 37.3333 },
  'tabora':         { latitude: -5.0167,  longitude: 32.8000 },
  'kigoma':         { latitude: -4.8833,  longitude: 29.6333 },
  'lindi':          { latitude: -9.9975,  longitude: 39.7147 },
  'mtwara':         { latitude: -10.2667, longitude: 40.1833 },
  'songea':         { latitude: -10.6833, longitude: 35.6500 },
  'shinyanga':      { latitude: -3.6600,  longitude: 33.4200 },
  'musoma':         { latitude: -1.5000,  longitude: 33.8000 },
  'bukoba':         { latitude: -1.3333,  longitude: 31.8167 },
};

export class GeocodingAdapterImpl implements GeocodingAdapter {
  constructor(private readonly googleApiKey?: string) {}

  async geocode(address: string): Promise<GeocodeResult> {
    // Try Google Maps Geocoding API first
    if (this.googleApiKey && this.googleApiKey !== 'DEVELOPMENT_MODE') {
      return this.geocodeWithGoogle(address);
    }

    // Fallback: Tanzania city lookup table
    return this.geocodeWithFallback(address);
  }

  private async geocodeWithGoogle(address: string): Promise<GeocodeResult> {
    const params = new URLSearchParams({
      address,
      key: this.googleApiKey!,
      region: 'tz', // bias results toward Tanzania
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API HTTP ${response.status}`);
    }

    const data = await response.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      error_message?: string;
    };

    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Geocoding failed: ${data.status} — ${data.error_message ?? 'no results'}`);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  }

  private geocodeWithFallback(address: string): GeocodeResult {
    const normalized = address.toLowerCase().trim();

    // Exact match
    if (TANZANIA_CITY_COORDS[normalized]) {
      return TANZANIA_CITY_COORDS[normalized];
    }

    // Partial match — find the first city name that appears in the address
    for (const [city, coords] of Object.entries(TANZANIA_CITY_COORDS)) {
      if (normalized.includes(city)) {
        return coords;
      }
    }

    throw new Error(
      `Address "${address}" could not be geocoded. ` +
      `Configure GOOGLE_MAPS_API_KEY for full geocoding support, ` +
      `or use a known Tanzania city name.`
    );
  }
}
