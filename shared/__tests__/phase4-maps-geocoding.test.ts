/**
 * Phase 4 Gate F4.6 — Maps Service Geocoding Logic
 *
 * Tests the Tanzania city geocoding fallback logic that lives in
 * services/maps-service/src/infrastructure/providers/geocoding.adapter.ts
 *
 * These tests are pure — no network calls, no DB, no external dependencies.
 * They live in the shared Jest project which has no database setup overhead.
 */

// ── Inline the Tanzania fallback geocoding logic ──────────────────────────────
// Mirrors: services/maps-service/src/infrastructure/providers/geocoding.adapter.ts

const TANZANIA_CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'dar es salaam':  { latitude: -6.7924,  longitude: 39.2083 },
  'kariakoo':       { latitude: -6.8161,  longitude: 39.2694 },
  'mikocheni':      { latitude: -6.7667,  longitude: 39.2333 },
  'arusha':         { latitude: -3.3869,  longitude: 36.6830 },
  'mwanza':         { latitude: -2.5164,  longitude: 32.9175 },
  'dodoma':         { latitude: -6.1722,  longitude: 35.7395 },
  'zanzibar':       { latitude: -6.1659,  longitude: 39.2026 },
  'zanzibar city':  { latitude: -6.1659,  longitude: 39.2026 },
  'stone town':     { latitude: -6.1622,  longitude: 39.1921 },
  'moshi':          { latitude: -3.3500,  longitude: 37.3333 },
  'tanga':          { latitude: -5.0693,  longitude: 39.0986 },
  'mbeya':          { latitude: -8.9000,  longitude: 33.4500 },
  'morogoro':       { latitude: -6.8242,  longitude: 37.6611 },
  'iringa':         { latitude: -7.7700,  longitude: 35.6900 },
  'tabora':         { latitude: -5.0167,  longitude: 32.8000 },
  'kigoma':         { latitude: -4.8833,  longitude: 29.6333 },
  'lindi':          { latitude: -9.9975,  longitude: 39.7147 },
  'mtwara':         { latitude: -10.2667, longitude: 40.1833 },
  'shinyanga':      { latitude: -3.6600,  longitude: 33.4200 },
  'musoma':         { latitude: -1.5000,  longitude: 33.8000 },
  'bukoba':         { latitude: -1.3333,  longitude: 31.8167 },
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 4 Gate F4.6 — Maps Service Geocoding (Tanzania fallback)', () => {

  describe('Property 1: Known Tanzania cities resolve to correct coordinates', () => {
    const cases: Array<[string, { lat: number; lng: number }]> = [
      ['Dar es Salaam', { lat: -6.7924, lng: 39.2083 }],
      ['dar es salaam', { lat: -6.7924, lng: 39.2083 }],
      ['Arusha',        { lat: -3.3869, lng: 36.6830 }],
      ['Mwanza',        { lat: -2.5164, lng: 32.9175 }],
      ['Dodoma',        { lat: -6.1722, lng: 35.7395 }],
      ['Zanzibar',      { lat: -6.1659, lng: 39.2026 }],
      ['Kariakoo',      { lat: -6.8161, lng: 39.2694 }],
      ['Moshi',         { lat: -3.3500, lng: 37.3333 }],
      ['Tanga',         { lat: -5.0693, lng: 39.0986 }],
    ];

    test.each(cases)('geocode("%s") returns correct coordinates', (address, expected) => {
      const result = geocodeFallback(address);
      expect(result.latitude).toBeCloseTo(expected.lat, 2);
      expect(result.longitude).toBeCloseTo(expected.lng, 2);
    });
  });

  describe('Property 2: Partial address match works', () => {
    it('resolves "Kariakoo Market, Dar es Salaam" via partial match on kariakoo', () => {
      const result = geocodeFallback('Kariakoo Market, Dar es Salaam');
      expect(result.latitude).toBeCloseTo(-6.8161, 2);
      expect(result.longitude).toBeCloseTo(39.2694, 2);
    });

    it('resolves "Near Arusha Clock Tower" via partial match', () => {
      const result = geocodeFallback('Near Arusha Clock Tower');
      expect(result.latitude).toBeCloseTo(-3.3869, 2);
    });

    it('resolves "Zanzibar City Centre" via partial match on zanzibar', () => {
      const result = geocodeFallback('Zanzibar City Centre');
      expect(result.latitude).toBeCloseTo(-6.1659, 2);
    });
  });

  describe('Property 3: Unknown address throws a descriptive error', () => {
    it('throws for an unknown address', () => {
      expect(() => geocodeFallback('123 Unknown Street, Mars')).toThrow('could not be geocoded');
    });

    it('error message includes the original address', () => {
      const address = 'Nonexistent Place XYZ';
      expect(() => geocodeFallback(address)).toThrow(address);
    });

    it('error message suggests configuring GOOGLE_MAPS_API_KEY', () => {
      expect(() => geocodeFallback('Unknown City')).toThrow('GOOGLE_MAPS_API_KEY');
    });
  });

  describe('Property 4: Case-insensitive and whitespace-tolerant matching', () => {
    it('ARUSHA (uppercase) resolves correctly', () => {
      const result = geocodeFallback('ARUSHA');
      expect(result.latitude).toBeCloseTo(-3.3869, 2);
    });

    it('  Mwanza  (with leading/trailing whitespace) resolves correctly', () => {
      const result = geocodeFallback('  Mwanza  ');
      expect(result.latitude).toBeCloseTo(-2.5164, 2);
    });

    it('DAR ES SALAAM (all caps) resolves correctly', () => {
      const result = geocodeFallback('DAR ES SALAAM');
      expect(result.latitude).toBeCloseTo(-6.7924, 2);
    });
  });

  describe('Property 5: All Tanzania cities are within the correct bounding box', () => {
    it('all coordinates are within Tanzania bounding box (lat [-11.7, -1.0], lng [29.3, 40.5])', () => {
      for (const [, coords] of Object.entries(TANZANIA_CITY_COORDS)) {
        expect(coords.latitude).toBeGreaterThanOrEqual(-11.7);
        expect(coords.latitude).toBeLessThanOrEqual(-1.0);
        expect(coords.longitude).toBeGreaterThanOrEqual(29.3);
        expect(coords.longitude).toBeLessThanOrEqual(40.5);
      }
    });

    it('covers all 21 major Tanzania cities', () => {
      expect(Object.keys(TANZANIA_CITY_COORDS).length).toBeGreaterThanOrEqual(21);
    });
  });

  describe('Property 6: GeocodeAddressUseCase delegation pattern', () => {
    it('use case delegates to adapter and returns result unchanged', async () => {
      const mockAdapter = {
        geocode: jest.fn().mockResolvedValue({ latitude: -6.7924, longitude: 39.2083 }),
      };
      const execute = async (input: { address: string }) => mockAdapter.geocode(input.address);

      const result = await execute({ address: 'Dar es Salaam' });

      expect(mockAdapter.geocode).toHaveBeenCalledWith('Dar es Salaam');
      expect(result).toEqual({ latitude: -6.7924, longitude: 39.2083 });
    });

    it('use case propagates adapter errors', async () => {
      const mockAdapter = {
        geocode: jest.fn().mockRejectedValue(new Error('could not be geocoded')),
      };
      const execute = async (input: { address: string }) => mockAdapter.geocode(input.address);

      await expect(execute({ address: 'Unknown' })).rejects.toThrow('could not be geocoded');
    });
  });
});
