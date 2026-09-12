# Maysar Maps Service — Implementation Reference (As-Built)

> **Status:** Live and verified — route calculation (Google Maps primary, HERE fallback), geocoding (Google + Tanzania city lookup), real-time tracking, traffic, weather.
> **Last updated:** September 2026
> **Scope:** `services/maps-service`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Only two HTTP endpoints are exposed to the frontend** | `POST /routing/calculate` and `POST /geocoding/geocode` — all other capabilities (tracking, traffic, weather) are consumed internally by the logistics service |
| **Provider registry pattern** | `MapsRegistry` registers one routing, one tracking, one traffic, one weather provider; swapped at init without changing consumers |
| **Google Maps circuit breaker** | `GoogleMapsRoutingAdapter` uses a named circuit breaker `'google-maps-api'` — 5 failures opens the circuit, 30s recovery timeout, 2 successes to close |
| **Geocoding fallback when no API key** | `GeocodingAdapterImpl` falls back to a hard-coded Tanzania city lookup table when `GOOGLE_MAPS_API_KEY` is absent or `'DEVELOPMENT_MODE'` |
| **Traffic/weather fallback when no API key** | `TrafficProviderAdapter` and `WeatherProviderAdapter` return rule-based defaults (rush hour traffic, clear weather) when their API keys are absent |
| **Polyline is custom semicolon-delimited format** | Route segments are serialized as `lat,lng;lat,lng;...` — NOT Google's encoded polyline format |

---

## 2. Provider Registry

| Provider | Interface | Primary implementation | Fallback |
|---|---|---|---|
| Routing | `RoutingPort` | `GoogleMapsRoutingAdapter` | `HereRoutingAdapter` (secondary) |
| Tracking | `TrackingPort` | `RealTimeTrackingAdapter` (in-memory) | — |
| Traffic | `TrafficPort` | `TrafficProviderAdapter` (Google Directions API) | Rule-based rush-hour model |
| Weather | `WeatherPort` | `WeatherProviderAdapter` (OpenWeatherMap) | Fixed clear-weather defaults |
| Geocoding | `GeocodingPort` | `GeocodingAdapterImpl` (Google Geocoding API) | Tanzania city lookup table |

---

## 3. Domain Value Objects

### GeoPoint (`domain/value-objects/geopoint.value-object.ts`)

Validated coordinate pair. Invariants enforced:
- Latitude: −90 to +90 (inclusive)
- Longitude: −180 to +180 (inclusive)
- Address string: non-empty when provided

Out-of-range coordinates throw before any provider is called → HTTP 422 `INVALID_COORDINATES`.

---

## 4. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `CalculateRouteUseCase` | Validates GeoPoints → calls routing provider → returns distance (km), duration (min), polyline |
| `GeocodeAddressUseCase` | Validates address string → calls geocoding adapter → returns `{ latitude, longitude }` |

Route calculation requires at least 2 waypoints (origin + destination). The Google adapter supports up to 25 total waypoints for multi-stop routes.

---

## 5. HTTP Surface

Mounted at `/api/maps` (module name `maps-service` → strip `-service` → `/api/maps`).

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/maps/routing/calculate` | none | Calculate route between two points |
| POST | `/api/maps/geocoding/geocode` | none | Convert address string to coordinates |
| GET | `/api/maps/health` | none | Health check |

Auth is not required — the service is called both by the frontend directly and by internal services (logistics-service). Network-level access control is used for internal calls.

---

## 6. Routing Response Details

```jsonc
// POST /api/maps/routing/calculate
// Request
{ "origin": { "lat": -6.7924, "lng": 39.2083 }, "destination": { "lat": -6.8235, "lng": 39.2695 } }

// Response 200
{ "success": true, "data": { "distance": 8.4, "duration": 22.5, "polyline": "-6.7950,39.2100;-6.8010,39.2300;-6.8235,39.2695" } }
```

**Polyline format:** semicolon-separated `lat,lng` pairs representing route segment endpoints. Parse:
```js
const points = polyline.split(';').map(pair => { const [lat, lng] = pair.split(',').map(Number); return { lat, lng }; });
```

- `distance` is in **kilometres**
- `duration` is in **minutes**
- Traffic-aware routing is always enabled (`departure_time=now`)
- `confidence` is always `0.95` from the Google adapter

---

## 7. Circuit Breaker (Google Maps Adapter)

| Parameter | Value |
|---|---|
| `failureThreshold` | 5 failures |
| `recoveryTimeout` | 30,000 ms |
| `successThreshold` | 2 successes in HALF_OPEN to close |

States: `CLOSED` (normal) → `OPEN` (failing fast, throws immediately) → `HALF_OPEN` (testing recovery) → `CLOSED`

When `OPEN`: HTTP 503 `PROVIDER_UNAVAILABLE`. Frontend should show a cached/estimated route or "Route unavailable" message and retry after 30s.

---

## 8. Geocoding Fallback Table

When `GOOGLE_MAPS_API_KEY` is absent or `'DEVELOPMENT_MODE'`, geocoding uses an exact/partial match lookup against known Tanzania cities:

Dar es Salaam, Kariakoo, Mikocheni, Arusha, Mwanza, Dodoma, Mbeya, Morogoro, Tanga, Zanzibar, Stone Town, Iringa, Moshi, Tabora, Kigoma, Lindi, Mtwara, Songea, Shinyanga, Musoma, Bukoba

Addresses not matching → 404 `ADDRESS_NOT_FOUND`. Google geocoding API biases results toward Tanzania (`region=tz`).

---

## 9. Internal Capabilities (Not Exposed as HTTP Routes)

These are consumed internally by the logistics service via the `MapsRegistry`:

**Traffic conditions** (`TrafficProviderAdapter`):
- Returns `{ level, averageSpeed, delayMinutes, incidents[] }` from Google Directions API
- Level thresholds: ratio > 1.5 → `standstill`, > 1.3 → `heavy`, > 1.1 → `moderate`, else `low`
- Fallback: rush hours 07:00–09:00 and 17:00–19:00 → `heavy` (15 km/h, 15 min delay), off-peak → `low`

**Weather conditions** (`WeatherProviderAdapter`):
- Returns `{ temperature, condition, visibility, precipitationProbability, windSpeed }` from OpenWeatherMap
- Condition values: `clear | rain | storm | fog | extreme`
- Fallback: `{ temperature: 25, condition: 'clear', visibility: 10, precipitationProbability: 0, windSpeed: 5 }`

**Real-time tracking** (`RealTimeTrackingAdapter`):
- In-memory store — not persisted across restarts
- Anomaly detection: `speed > 100 km/h` → `SPEED_VIOLATION`
- ETA calculation returns a fixed 15 minutes (placeholder — production uses routing)
