# Courier Flows — Maps Service

> **Verification status:** Partially Verified (internal service — no direct courier-facing endpoints)
> **Verification basis:** `docs/FLOWS/_inventory.md`; `docs/maps/MAPS_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

maps-service is an **internal service** consumed by logistics-service for route optimization and geocoding. Couriers do not call maps-service endpoints directly — logistics-service pre-computes routes and delivers them as part of the DeliveryJob payload. This document is informational only.

---

## Internal Endpoints (Not User-Facing)

| Endpoint | Consumer | Purpose | Verification |
|---|---|---|---|
| `POST /api/maps/routing/calculate` | logistics-service | Route optimization between pickup and delivery address | Partially Verified |
| `POST /api/maps/geocoding/geocode` | logistics-service | Address text → lat/lng coordinates | Partially Verified |

All other maps-service capabilities (tracking, traffic, weather) are internal and not exposed via HTTP to any frontend client.

---

## Courier Experience

The courier app receives pre-computed routing information as part of the DeliveryJob payload from logistics-service. The courier does not need to call any maps-service endpoints directly.

- Routing data is embedded in the logistics API response when a DeliveryJob is fetched
- Route recalculation (if needed) is triggered by the Courier App calling the logistics API, which internally calls maps-service
- The courier sees turn-by-turn directions rendered from the route data in the logistics response

**See:** `docs/FLOWS/logistics/user-flow/courier-flows.md` — Flow 2 (Delivery Execution) for the courier-facing delivery flow that uses routing data.
