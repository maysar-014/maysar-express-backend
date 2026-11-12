# Courier Flows — Maps Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-30)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-30 (2026-11-06)
> **Last updated:** 2026-11-06 (GAP-016 resolved: Haversine fallback added; routing now returns 200 without API key)

## Overview

maps-service is an **internal service** consumed by logistics-service for route optimization and geocoding. Couriers do not call maps-service endpoints directly — logistics-service pre-computes routes and delivers them as part of the DeliveryJob payload. This document is informational only.

---

## Internal Endpoints (Not User-Facing)

| Endpoint | Consumer | Purpose | Verification |
|---|---|---|---|
| `POST /api/maps/routing/calculate` | logistics-service / lifecycle tests | Route optimization between pickup and delivery address | Verified |
| `POST /api/maps/geocoding/geocode` | logistics-service / lifecycle tests | Address text → lat/lng coordinates | Verified |

**Routing request body:** `{ origin: { lat: number, lng: number }, destination: { lat: number, lng: number } }`

**Returns:** `{ success: true, data: { distance: number (km), duration: number (minutes), polyline: "..." } }`

**Routing provider:** When `GOOGLE_MAPS_API_KEY` is configured, the service uses the Google Maps Directions API. When the key is absent (development/CI), the service automatically falls back to the `HaversineRoutingAdapter`, which computes straight-line great-circle distances with a 1.35× road inflation factor and 30 km/h average speed — the same model used by the logistics service's `ConsolidationOrchestrator`. The endpoint always returns 200 regardless of which provider is active.

All other maps-service capabilities (tracking, traffic, weather) are internal and not exposed via HTTP to any frontend client.

---

## Courier Experience

The courier app receives pre-computed routing information as part of the DeliveryJob payload from logistics-service. The courier does not need to call any maps-service endpoints directly.

- Routing data is embedded in the logistics API response when a DeliveryJob is fetched
- Route recalculation (if needed) is triggered by the Courier App calling the logistics API, which internally calls maps-service
- The courier sees turn-by-turn directions rendered from the route data in the logistics response

**See:** `docs/FLOWS/logistics/user-flow/courier-flows.md` — Flow 2 (Delivery Execution) for the courier-facing delivery flow that uses routing data.
