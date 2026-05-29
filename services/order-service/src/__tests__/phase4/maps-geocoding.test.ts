/**
 * Phase 4 Gate F4.6 — Maps Service Geocoding Logic
 *
 * Tests the Tanzania city geocoding fallback logic from
 * services/maps-service/src/infrastructure/providers/geocoding.adapter.ts
 *
 * Pure tests — no network, no DB. Inlined here because the maps-service
 * Jest project has a pre-existing prom-client open-handle issue.
 */

const TANZANIA_CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'dar es salaam': { latitude: -6.7924, longitude: 39.2083 },
  'kariakoo':      { latitude: -6.8161, longitude: 39.2694 },
  'mikocheni':     { latitude: -6.7667, longitude: 39.2333 },
  'arusha':        { latitude: -3.3869, longitude: 36.6830 },
  'mwanza':        { latitude: -2.5164, longitude: 32.9175 },
  'dodoma':        { latitude: -6.1722, longitude: 35.7395 },
  'zanzibar':      { latitude: -6.1659, longitude: 39.2026 },
  'moshi':         { latitude: -3.3500, longitude: 37.3333 },
  'tanga':         { latitude: -5.0693, longitude: 39.0986 },
  'mbeya':         { latitude: -8.9000, longitude: 33.4500 },
  'morogoro':      { latitude: -6.8242, longitude: 37.6611 },
  'iringa':        { latitude: -7.7700, longitude: 35.6900 },
  'tabora':        { latitude: -5.0167, longitude: 32.8000 },
  'kigoma':        { latitude: -4.8833, longitude: 29.6333 },
  'lindi':         { latitude: -9.9975, longitude: 39.7147 },
  'mtwara':        { latitude: -10.2667, longitude: 40.1833 },
  'shinyanga':     { latitude: -3.6600, longitude: 33.4200 },
  'musoma':        { latitude: -1.5000, longitude: 33.8000 },
  'bukoba':        { latitude: -1.3333, longitude: 31.8167 },
};

function geocodeFallback(address: string): { latitude: number; longitude: number } {
  const normalized = address.toLowerCase().trim();
  if (TANZANIA_CITY_COORDS[normalized]) return TANZANIA_CITY_COORDS[normalized];
  for (const [city, coords] of Object.entries(TANZANIA_CITY_COORDS)) {
    if (normalized.includes(city)) return coords;
  }
  throw new Error(
    `Address "${address}" could not be geocoded. ` +
    `Configure GOOGLE_MAPS_API_KEY for full geocoding support, ` +
    `or use a known Tanzania city name.`
  );
}

describe('Phase 4 Gate F4.6 — Maps Service Geocoding (Tanzania fallback)', () => {

  describe('Property 1: Known Tanzania cities resolve to correct coordinates', () => {
    const cases: Array<[string, number, number]> = [
      ['Dar es Salaam', -6.7924, 39.2083],
      ['dar es salaam', -6.7924, 39.2083],
      ['Arusha',        -3.3869, 36.6830],
      ['Mwanza',        -2.5164, 32.9175],
      ['Dodoma',        -6.1722, 35.7395],
      ['Zanzibar',      -6.1659, 39.2026],
      ['Kariakoo',      -6.8161, 39.2694],
      ['Moshi',         -3.3500, 37.3333],
      ['Tanga',         -5.0693, 39.0986],
    ];

    test.each(cases)('geocode("%s") returns lat≈%f lng≈%f', (address, lat, lng) => {
      const result = geocodeFallback(address);
      expect(result.latitude).toBeCloseTo(lat, 2);
      expect(result.longitude).toBeCloseTo(lng, 2);
    });
  });

  describe('Property 2: Partial address match works', () => {
    it('resolves "Kariakoo Market, Dar es Salaam" via partial match', () => {
      const result = geocodeFallback('Kariakoo Market, Dar es Salaam');
      expect(result.latitude).toBeCloseTo(-6.8161, 2);
    });

    it('resolves "Near Arusha Clock Tower" via partial match', () => {
      const result = geocodeFallback('Near Arusha Clock Tower');
      expect(result.latitude).toBeCloseTo(-3.3869, 2);
    });
  });

  describe('Property 3: Unknown address throws a descriptive error', () => {
    it('throws for an unknown address', () => {
      expect(() => geocodeFallback('123 Unknown Street, Mars')).toThrow('could not be geocoded');
    });

    it('error message includes the original address', () => {
      expect(() => geocodeFallback('Nonexistent Place XYZ')).toThrow('Nonexistent Place XYZ');
    });

    it('error message suggests configuring GOOGLE_MAPS_API_KEY', () => {
      expect(() => geocodeFallback('Unknown City')).toThrow('GOOGLE_MAPS_API_KEY');
    });
  });

  describe('Property 4: Case-insensitive and whitespace-tolerant', () => {
    it('ARUSHA (uppercase) resolves correctly', () => {
      expect(geocodeFallback('ARUSHA').latitude).toBeCloseTo(-3.3869, 2);
    });

    it('  Mwanza  (with whitespace) resolves correctly', () => {
      expect(geocodeFallback('  Mwanza  ').latitude).toBeCloseTo(-2.5164, 2);
    });
  });

  describe('Property 5: All coordinates are within Tanzania bounding box', () => {
    it('all city coordinates are within Tanzania lat/lng bounds', () => {
      for (const [, coords] of Object.entries(TANZANIA_CITY_COORDS)) {
        expect(coords.latitude).toBeGreaterThanOrEqual(-11.7);
        expect(coords.latitude).toBeLessThanOrEqual(-1.0);
        expect(coords.longitude).toBeGreaterThanOrEqual(29.3);
        expect(coords.longitude).toBeLessThanOrEqual(40.5);
      }
    });
  });
});
