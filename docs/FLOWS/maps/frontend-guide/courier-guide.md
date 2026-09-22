# Courier Guide — Maps Service

> Mirrors: `docs/FLOWS/maps/user-flow/courier-flows.md`
> Verification status: Partially Verified (internal service)
> Last updated: September 2026

## Overview

Maps-service is an internal service consumed by logistics-service. Couriers do not call maps-service endpoints directly. Routing data is delivered as part of the DeliveryJob payload from logistics-service.

**No direct API calls to maps-service are needed from the courier frontend.**

---

## Routing Data in the Courier App

Route data is embedded in the logistics API response when a DeliveryJob is fetched:
- Turn-by-turn directions included in the DeliveryJob payload
- Route recalculation is triggered through the logistics API, which calls maps-service internally
- The courier app renders the route from the logistics response data

**See:** `docs/FLOWS/logistics/frontend-guide/courier-guide.md` for the delivery flow that uses routing data.

---

## Internal Endpoints (Reference Only)

| Endpoint | Consumer | Not for direct use |
|---|---|---|
| `POST /api/maps/routing/calculate` | logistics-service only | ❌ Do not call from courier app |
| `POST /api/maps/geocoding/geocode` | logistics-service only | ❌ Do not call from courier app |
