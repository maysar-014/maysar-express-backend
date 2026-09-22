# Maps Service — Frontend Integration Guide

> Mount path: `/api/maps`
> Auth: not required (internal service — called by logistics, order, and frontend directly)

---

## Architecture

The service wraps four external providers behind a unified registry:

| Provider | Purpose |
|---|---|
| `GoogleMapsRoutingAdapter` | Route calculation (primary) |
| `HereRoutingAdapter` | Route calculation (secondary/fallback) |
| `RealTimeTrackingAdapter` | Courier location storage and ETA |
| `TrafficProviderAdapter` | Traffic conditions (Google Directions API) |
| `WeatherProviderAdapter` | Weather conditions (OpenWeatherMap API) |

The two HTTP endpoints exposed to frontend are `/routing/calculate` and `/geocoding/geocode`. All other provider capabilities (tracking, traffic, weather) are consumed internally by the logistics service — they are not directly exposed as HTTP routes.

---

## Business Rules (from domain code)

### GeoPoint validation

All coordinate inputs are validated:
- Latitude: `-90` to `+90` (inclusive)
- Longitude: `-180` to `+180` (inclusive)
- Address string: must be non-empty

Out-of-range values return `422 INVALID_COORDINATES`.

> ⚠️ **As-built note:** The HTTP route only validates that `lat` and `lng` are present and numeric — it does **not** enforce the `-90/+90` and `-180/+180` range bounds at the HTTP layer. Range validation happens inside `GeoPoint.create()` in the domain. If a provider throws on an out-of-range value, the route returns `500 ROUTING_FAILED`, not `422`.

### Route calculation

- Requires **at least 2 waypoints** (origin + destination).
- Google adapter supports up to **25 total waypoints** for multi-stop routes.
- Traffic-aware routing is **always enabled** (`departure_time=now`).
- Response `distance` is in **kilometres**, `duration` in **minutes**.
- `efficiency` (0–100) = straight-line distance ÷ actual route distance × 100. Higher = more direct.
- `confidence` is always `0.95` from the Google adapter.

### RouteConstraints (available to internal callers, not exposed via HTTP)

```ts
{
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'van' | 'truck';
  maxHeight?: number;
  maxWeight?: number;
}
```

HERE adapter maps `vehicleType: 'motorcycle'` → `transportMode: 'scooter'`, all others → `'car'`.

### Circuit breaker (Google Maps adapter)

The Google adapter uses a named circuit breaker `'google-maps-api'` created with:

| Parameter | Value |
|---|---|
| `failureThreshold` | 5 failures |
| `recoveryTimeout` | 30,000 ms (30 seconds) |
| `successThreshold` | 2 successes in HALF_OPEN to close |

States: `CLOSED` (normal) → `OPEN` (failing fast) → `HALF_OPEN` (testing recovery) → `CLOSED`

When `OPEN`: throws `"Circuit breaker is OPEN"` → HTTP `503 PROVIDER_UNAVAILABLE`.

Default `createCircuitBreaker` factory defaults (used by other breakers): `failureThreshold: 5`, `recoveryTimeout: 60,000 ms`, `successThreshold: 3`.

### Geocoding fallback

When `GOOGLE_MAPS_API_KEY` is absent or set to `'DEVELOPMENT_MODE'`, the geocoding adapter falls back to a **Tanzania city lookup table** with exact/partial matching. Known cities include: Dar es Salaam, Kariakoo, Mikocheni, Arusha, Mwanza, Dodoma, Mbeya, Morogoro, Tanga, Zanzibar, Stone Town, Iringa, Moshi, Tabora, Kigoma, Lindi, Mtwara, Songea, Shinyanga, Musoma, Bukoba.

Addresses not matching any city in the table → `404 ADDRESS_NOT_FOUND`.

Google geocoding API biases results toward Tanzania (`region=tz`).

### Traffic conditions (TrafficConditions shape)

```ts
{
  level: 'low' | 'moderate' | 'heavy' | 'standstill';
  averageSpeed: number;   // km/h
  delayMinutes: number;
  incidents: Array<{
    type: 'accident' | 'construction' | 'closure' | 'event';
    description: string;
    location: { lat, lng, address };
    severity: number;
  }>;
}
```

Traffic level thresholds (from `duration_in_traffic / duration` ratio):
- ratio > 1.5 → `standstill`
- ratio > 1.3 → `heavy`
- ratio > 1.1 → `moderate`
- otherwise → `low`

Fallback (no API key): rush hours 07:00–09:00 and 17:00–19:00 → `heavy` (15 km/h, 15 min delay). Off-peak → `low` (45 km/h, 0 delay).

### Weather conditions (WeatherConditions shape)

```ts
{
  temperature: number;              // °C
  condition: 'clear' | 'rain' | 'storm' | 'fog' | 'extreme';
  visibility: number;               // km
  precipitationProbability: number; // 0–100
  windSpeed: number;                // m/s
}
```

Fallback (no API key): `{ temperature: 25, condition: 'clear', visibility: 10, precipitationProbability: 0, windSpeed: 5 }`.

### Tracking (RealTimeTrackingAdapter)

In-memory store (not persisted across restarts). Anomaly detection: `speed > 100` → `SPEED_VIOLATION`. ETA calculation returns a fixed `15` minutes (placeholder — production would use routing).

---

## HTTP Endpoints

### Calculate route
```
POST /api/maps/routing/calculate
```

```jsonc
// Request
{
  "origin":      { "lat": -6.7924, "lng": 39.2083 },
  "destination": { "lat": -6.8235, "lng": 39.2695 }
}
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "distance": 8.4,     // kilometres
    "duration": 22.5,    // minutes
    "polyline": "-6.7950,39.2100;-6.8010,39.2300;-6.8235,39.2695"
  }
}
```

The `polyline` is a **semicolon-separated list of `lat,lng` segment endpoints** — not Google's encoded polyline format.

```js
// Parse polyline for map rendering
const points = data.polyline.split(';').map(pair => {
  const [lat, lng] = pair.split(',').map(Number);
  return { lat, lng };
});
```

Errors:
- `422 INVALID_COORDINATES` — `lat` or `lng` missing or not a number
- `503 PROVIDER_UNAVAILABLE` — circuit breaker OPEN or provider not initialised
- `500 ROUTING_FAILED` — provider returned no routes or API-level error

### Geocode address
```
POST /api/maps/geocoding/geocode
```

```jsonc
// Request
{ "address": "Kariakoo Market, Dar es Salaam" }
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "latitude":  -6.8161,
    "longitude": 39.2694
  }
}
```

Errors:
- `422 INVALID_ADDRESS` — empty or non-string address
- `404 ADDRESS_NOT_FOUND` — address not found (Google returned no results, or fallback table has no match)
- `500 GEOCODING_FAILED` — provider HTTP error

### Health check
```
GET /api/maps/health
```

---

## Common integration patterns

### Delivery distance check before checkout

```
1. User enters delivery address
2. POST /api/maps/geocoding/geocode  { address }
   → { latitude, longitude }
3. POST /api/maps/routing/calculate
   { origin: sellerCoords, destination: { lat: latitude, lng: longitude } }
   → { distance, duration }
4. Compare distance against COD tier limit (from user-service COD reputation)
5. Show estimated delivery time from duration (minutes)
```

### Show route on courier tracking screen

```
1. POST /api/maps/routing/calculate
   { origin: courierCurrentLocation, destination: dropoffCoords }
   → { polyline, duration }
2. Parse polyline → array of { lat, lng }
3. Render on map
4. Refresh every 60s as courier moves
```

### Handle circuit breaker open state

```js
try {
  const route = await calculateRoute(origin, destination);
} catch (err) {
  if (err.status === 503 && err.code === 'PROVIDER_UNAVAILABLE') {
    // Show cached/estimated route or "Route unavailable" message
    // Retry after 30s (circuit breaker recovery timeout)
  }
}
```

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_COORDINATES` | 422 | `lat`/`lng` missing or not numeric |
| `INVALID_ADDRESS` | 422 | Address is empty or not a string |
| `ADDRESS_NOT_FOUND` | 404 | Address not geocodable (no Google result or not in fallback table) |
| `PROVIDER_UNAVAILABLE` | 503 | Circuit breaker OPEN or provider not initialised |
| `ROUTING_FAILED` | 500 | Provider returned no routes or API-level error |
| `GEOCODING_FAILED` | 500 | Provider HTTP error during geocoding |
