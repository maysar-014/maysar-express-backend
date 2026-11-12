# Maysar Location Management System — Integration Guide

**Version:** 1.0  
**Service:** `catalog-service`  
**Base Path:** `/api/catalog/seller-locations`  
**Status:** Production Ready  
**Last Updated:** 2026-10-18

---

## 1. Overview

The Maysar Location Management System connects Tanzania's administrative geography
(Country → Region → District → Ward → Street) to the physical locations where
sellers operate. It provides:

- **Geographic reference data** (Country, Region, District, Ward, Street) —
  provided by the frontend; backend stores and validates parent-child integrity.
- **Seller operational locations** (shops, warehouses, pickup points) with
  addresses, coordinates, contact details, operating hours, fulfillment
  capabilities, and delivery coverage radius.
- **Buyer saved addresses** (managed by `user-service`) with the same geographic
  ID linkage.
- **Inventory authority** lives in `inventory-service` (`inventory_stock_items`,
  `inventory_warehouses`, `inventory_pending_stock_outs`). Catalog owns only
  location metadata and provisions an owned `Inventory_Warehouse` per location.

---

## 2. Architecture & Module Boundaries

| Concern | Owning Service | Key Models |
|---------|---------------|------------|
| Geographic reference data | `catalog-service` | `Geography_Country`, `Geography_Region`, `Geography_District`, `Geography_Ward`, `Geography_Street` |
| Seller operational locations | `catalog-service` | `Catalog_SellerLocation` |
| Buyer saved addresses | `user-service` | `User_UserAddress` |
| Physical stock & transfers | `inventory-service` | `Inventory_Warehouse`, `Inventory_StockItem`, `Inventory_PendingStockOut` |
| Stock reservations & reconciliation | `inventory-service` | `Inventory_Reservation`, `Inventory_PendingStockOut` |

**Key design rule:** Catalog never stores stock quantities. Stock lives exclusively
in `inventory-service`. When a seller location is created/updated, Catalog
automatically provisions (or syncs) a matching `Inventory_Warehouse` linked via
`sellerLocationId`. All stock checks, transfers, and stock-outs must go through
the inventory-service APIs (`/api/inventory/*`).

---

## 3. Prerequisites

Before integrating, ensure:

1. **Database migrations applied:**
   ```bash
   npx prisma migrate deploy
   ```
   Migration `20261018000000_canonical_seller_inventory` creates the geography
   tables, adds `sellerId`/`sellerLocationId` to `inventory_warehouses`, adds
   `quantityUnavailable`/`quantityInTransit` to `inventory_stock_items`, and
   drops the legacy `catalog_product_locations` / `catalog_stock_transfers` tables.

2. **Redis running** (required for idempotency middleware):
   ```bash
   REDIS_URL=redis://redis:6379
   ```

3. **Frontend provides geographic reference data:** The `Geography_*` tables must
   be seeded with Tanzania's administrative hierarchy before locations can be
   created with valid `regionId`/`districtId`/`wardId`/`streetId`.

---

## 4. Mounting the Routes

The catalog-service module registry mounts routes automatically. In
`services/catalog-service/index.ts`:

```ts
import { createSellerLocationRoutes } from './src/api/routes/seller-location.routes';

// Inside CatalogModule.initialize():
router.use('/seller-locations', createSellerLocationRoutes(prisma));
```

Routes are mounted at `/api/catalog/seller-locations`.

---

## 5. API Reference

### 5.1 Geographic Hierarchy (Frontend-Provided Reference Data)

These endpoints return canonical geographic entities. All return `200 OK` with a
JSON array of `{ id, code, name }`.

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| `GET` | `/geography/regions` | `?countryId=` | List regions (optionally filtered by country) |
| `GET` | `/geography/districts` | `?regionId=` (required) | List districts within a region |
| `GET` | `/geography/wards` | `?districtId=` (required) | List wards within a district |
| `GET` | `/geography/streets` | `?wardId=` (required) | List streets within a ward |
| `GET` | `/geography/validate` | `?countryId=&regionId=&districtId=&wardId=&streetId=` | Validate a geographic ID parent-child chain |

**Example:**
```bash
# Get all regions in Tanzania
GET /api/catalog/seller-locations/geography/regions?countryId=tz_country_id

# Get districts within a region
GET /api/catalog/seller-locations/geography/districts?regionId=dsm_region_id

# Validate a full hierarchy
GET /api/catalog/seller-locations/geography/validate?countryId=tz&regionId=dsm&districtId=ilala&wardId=kivukoni&streetId=uhuru
```

**Response (regions example):**
```json
[
  { "id": "reg_dsm", "code": "DSM", "name": "Dar es Salaam" },
  { "id": "reg_aru", "code": "ARU", "name": "Arusha" }
]

### 5.2 Location CRUD (Seller)

All location routes require authentication (`requireAuth`). The seller's identity
is resolved from the JWT (`req.user.userId`).

#### Create a Location
**`POST /`** — Requires `Idempotency-Key` header.

**Request Body:**
```json
{
  "name": "Kariakoo Shop",
  "type": "SHOP",
  "street": "Kariakoo Market",
  "ward": "Kivukoni",
  "district": "Ilala",
  "region": "Dar es Salaam",
  "country": "Tanzania",
  "countryId": "tz_country_id",
  "regionId": "dsm_region_id",
  "districtId": "ilala_district_id",
  "wardId": "kivukoni_ward_id",
  "streetId": "uhuru_street_id",
  "locality": "Near the mosque",
  "directions": "Behind the main market entrance",
  "latitude": -6.8167,
  "longitude": 39.2833,
  "fulfillmentCapabilities": ["pickup", "delivery"],
  "isPrimary": true,
  "operatingHours": { "mon": "08:00-18:00", "tue": "08:00-18:00" },
  "notes": "Flagship shop",
  "contactName": "John Doe",
  "contactPhone": "+255712345678",
  "staffCount": 5,
  "deliveryCoverageRadiusKm": 5.5
}
```

**Validation Rules:**
- `latitude` must be within Tanzania bounds `[-12, 0.5]`
- `longitude` must be within Tanzania bounds `[28, 41]`
- `region` and `country` are required
- `street`, `locality`, or `directions` — at least one is required
- If any geographic ID is provided (`countryId`, `regionId`, etc.), the full
  parent-child chain must be valid
- `contactPhone` must match Tanzania format: `+255...`, `0...`, or `255...`
- `staffCount` must be a non-negative integer
- `deliveryCoverageRadiusKm` must be non-negative
- Max 10 active locations per seller
- Exactly one `isPrimary` per seller

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "sloc_abc123",
    "sellerId": "seller_xyz",
    "name": "Kariakoo Shop",
    "type": "SHOP",
    "status": "ACTIVE",
    "address": {
      "street": "Kariakoo Market",
      "ward": "Kivukoni",
      "district": "Ilala",
      "region": "Dar es Salaam",
      "country": "Tanzania",
      "countryId": "tz_country_id",
      "regionId": "dsm_region_id",
      "districtId": "ilala_district_id",
      "wardId": "kivukoni_ward_id",
      "streetId": "uhuru_street_id",
      "locality": "Near the mosque",
      "directions": "Behind the main market entrance"
    },
    "fulfillmentCapabilities": ["pickup", "delivery"],
    "locationCode": "LOC-DSM-001",
    "contactName": "John Doe",
    "contactPhone": "+255712345678",
    "staffCount": 5,
    "deliveryCoverageRadiusKm": 5.5,
    "coordinates": { "latitude": -6.8167, "longitude": 39.2833 },
    "isPrimary": true,
    "isActive": true,
    "operatingHours": { "mon": "08:00-18:00" },
    "notes": "Flagship shop",
    "createdAt": "2026-10-18T00:00:00Z",
    "updatedAt": "2026-10-18T00:00:00Z"
  }
}
```

#### Get a Location
**`GET /:locationId`**

Returns the location DTO. Returns `404` if not found, `403` if not owned by the
authenticated seller.

#### Update a Location
**`PUT /:locationId`** — Requires `Idempotency-Key` header.

Accepts the same fields as create (all optional except those being changed).
Deactivating a location (`isActive: false`) is blocked if the linked inventory
warehouse has stock (`quantityAvailable > 0`, `quantityReserved > 0`,
`quantityUnavailable > 0`, or `quantityInTransit > 0`).

#### List Locations
**`GET /`**

Returns all locations for the authenticated seller, ordered by `isPrimary` desc
then `createdAt` asc.

## 6. Location Metrics & Detail Panel

### Location Summary Metrics
**`GET /:locationId/metrics`**

Returns:
```json
{
  "success": true,
  "data": {
    "locationId": "sloc_abc123",
    "warehouseId": "wh_def456",
    "staffCount": 5,
    "isActive": true,
    "isPrimary": true,
    "fulfillmentCapabilities": ["pickup", "delivery"],
    "deliveryCoverageRadiusKm": 5.5,
    "lastActivityAt": "2026-10-18T00:00:00Z"
  }
}
```

### Location Detail Panel
**`GET /:locationId/detail`**

Returns:
```json
{
  "success": true,
  "data": {
    "location": { ...full location DTO... },
    "fulfillmentSettings": {
      "capabilities": ["pickup", "delivery"],
      "operatingHours": { "mon": "08:00-18:00" },
      "isPrimary": true,
      "isActive": true,
      "contactName": "John Doe",
      "contactPhone": "+255712345678",
      "deliveryCoverageRadiusKm": 5.5
    },
    "inventory": {
      "warehouseId": "wh_def456",
      "note": "Physical stock lives in inventory-service. Query /api/inventory/stock-outs and /api/inventory/warehouses for stock data."
    }
  }
}
```

### Location Report (PDF)
**`GET /:locationId/report/pdf`**

Returns a PDF document (`application/pdf`) containing:
- Location info (name, type, status, address, coordinates)
- Contact & fulfillment settings
- Stock by product table with totals
- Inventory warehouse linkage note

**Headers:**
```
Content-Disposition: attachment; filename="location-{id}-report.pdf"
Content-Length: {bytes}
```

#### Search Locations
**`GET /search`**

| Query Param | Type | Description |
|-------------|------|-------------|
| `q` | string | Search across name, street, ward, district, region, locality |
| `type` | string | Filter by `SHOP`\|`WAREHOUSE`\|`PICKUP_POINT`\|`HOME_BASED`\|`DISTRIBUTION_CENTER` |
| `status` | string | Filter by `ACTIVE`\|`INACTIVE`\|`SUSPENDED` |
| `isActive` | string | `"true"` or `"false"` |
| `regionId` | string | Filter by geographic region ID |
| `districtId` | string | Filter by geographic district ID |
| `wardId` | string | Filter by geographic ward ID |
| `streetId` | string | Filter by geographic street ID |
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Page size (default: 20) |

**CSV Export:** Add `?export=csv` to download all matching locations as a CSV
attachment (`seller-locations.csv`).

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [...],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

#### Deactivate / Reactivate
**`PATCH /:locationId/deactivate`** — Sets `isActive: false`, `status: INACTIVE`.
Blocked if stock exists at the linked inventory warehouse.

**`PATCH /:locationId/activate`** — Sets `isActive: true`, `status: ACTIVE`.

#### Delete a Location
**`DELETE /:locationId`** — Admin only (`requireRole(['admin'])`).
Hard-deletes the location. Physical stock in `inventory-service` is **not**
deleted by this operation (it lives in `inventory_stock_items`).

## 7. Idempotency

**Endpoints:** `POST /` and `PUT /:locationId`

**Header:** `Idempotency-Key: <unique-key>`

- First request with a key is processed normally and the response is cached for
  24 hours.
- Subsequent requests with the same key return the cached response (same status
  code and body) without re-executing business logic.
- Concurrent requests with the same key receive `409 Conflict` ("Request already
  in progress").
- Missing key returns `400 Bad Request`.

**Example:**
```bash
curl -X POST /api/catalog/seller-locations \
  -H "Idempotency-Key: loc-create-kariakoo-001" \
  -H "Authorization: Bearer <token>" \
  -d '{...}'
```

## 8. Geography Validation

**`GET /geography/validate`**

Validates that a set of geographic IDs forms a valid parent-child chain:
- If `streetId` is provided, its `wardId` must match (or `wardId` must be omitted).
- If `wardId` is provided, its `districtId` must match (or `districtId` must be omitted).
- If `districtId` is provided, its `regionId` must match (or `regionId` must be omitted).
- If `regionId` is provided, its `countryId` must match (or `countryId` must be omitted).

**Response:**
```json
{ "success": true, "data": { "valid": true } }
```

## 9. Location-to-Inventory Bridge

When a seller location is saved (create or update), Catalog automatically
provisions or syncs an `Inventory_Warehouse` record:

| Catalog Field | Inventory Field |
|--------------|-----------------|
| `id` (location) | `sellerLocationId` |
| `sellerId` | `sellerId` |
| `name` | `name` |
| `address` (full object) | `address` (JSON) |
| `isActive` | `status` (`active`/`inactive`) |
| `operatingHours` | `operatingHours` |
| `locationCode` | `code` (falls back to `WH-{id}`) |

**Warehouse type mapping:**
- `WAREHOUSE` or `DISTRIBUTION_CENTER` → `central`
- All others → `store`

**Important:** Stock quantities (`quantityAvailable`, `quantityReserved`,
etc.) are **not** set by Catalog. They are managed exclusively by
`inventory-service` via stock-in, stock-out, reservation, and reconciliation
workflows.

## 10. Error Responses

All errors follow the canonical shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation",
    "details": { ...optional context... },
    "timestamp": "2026-10-18T00:00:00Z",
    "path": "/api/catalog/seller-locations/"
  }
}
```

| HTTP Status | Error Code | Condition |
|-------------|-----------|-----------|
| `400` | `VALIDATION_ERROR` | Missing idempotency key, invalid phone, invalid coordinates, missing required fields |
| `401` | `MISSING_TOKEN` | Authentication required |
| `403` | `INSUFFICIENT_PERMISSIONS` | Not the location owner, or non-admin trying to delete |
| `404` | `RESOURCE_NOT_FOUND` | Location not found |
| `409` | `RESOURCE_CONFLICT` | Idempotency lock contention, or request already in progress |
| `422` | `BUSINESS_RULE_VIOLATION` | Cannot deactivate location with stock, max 10 active locations, invalid geography hierarchy |

## 11. Frontend Integration Checklist

1. **Seed geography data** — Populate `Geography_Country`, `Geography_Region`,
   `Geography_District`, `Geography_Ward`, `Geography_Street` with Tanzania's
   administrative hierarchy before allowing location creation.

2. **Hierarchical selection UI** — Use `/geography/regions` → `/geography/districts?regionId=` →
   `/geography/wards?districtId=` → `/geography/streets?wardId=` for cascading
   dropdowns. Validate the final selection with `/geography/validate`.

3. **Manual fallback** — When official street data is unavailable, allow users
   to enter `locality` (free-text) and/or `directions` (practical directions)
   instead of a `streetId`. The administrative hierarchy (country→region→district→ward)
   must still be selected.

4. **Idempotency keys** — Generate a unique `Idempotency-Key` for every
   `POST /` and `PUT /:locationId` request (e.g., `loc-create-{sellerId}-{timestamp}`).

5. **Stock queries** — Do not query Catalog for stock quantities. Use
   `inventory-service` endpoints (`/api/inventory/stock-outs`,
   `/api/inventory/warehouses`) for stock levels, transfers, and reconciliation.

6. **PDF reports** — Call `GET /:locationId/report/pdf` to generate a
   downloadable PDF report for a location.

7. **CSV exports** — Call `GET /search?export=csv` with optional filters
   (`q`, `type`, `status`, `isActive`, `regionId`, `districtId`, `wardId`,
   `streetId`) to export matching locations to CSV.

## 12. Testing

Run the catalog-service test suite:

```bash
# Unit tests for location entities and repository
NODE_OPTIONS="--max-old-space-size=4096" npx jest \
  services/catalog-service/src/domain/entities/__tests__/seller-location.entity.test.ts \
  services/catalog-service/src/infrastructure/repositories/__tests__/prisma-seller-location.repository.test.ts \
  shared/middleware/idempotency.test.ts \
  --no-coverage
```

TypeScript compilation:
```bash
npx tsc --noEmit --project tsconfig.json
```

Prisma schema validation:
```bash
npx prisma validate
```

## 13. Related Documents

- `docs/adr/inventory-consolidation-decision.md` — Decision to make
  `inventory-service` the canonical stock authority
- `LOCATION_MANAGEMENT_BACKLOG.md` — Full enhancement backlog with story points
- `prisma/schema.prisma` — Full data model (lines 4712–4820)
- `services/catalog-service/src/domain/entities/seller-location.entity.ts` —
  Domain entity with validation invariants

---

## End of Document
```