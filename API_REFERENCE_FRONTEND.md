# Maysar Location API — Frontend Reference

Base URL: `/api/catalog/seller-locations`

All endpoints require a JWT in the `Authorization: Bearer <token>` header.

Every JSON response uses one of two shapes:

```jsonc
// success
{ "success": true, "data": <T> }

// error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable text",
    "timestamp": "2026-10-18T00:00:00Z",
    "path": "/api/catalog/seller-locations/"
  }
}
```

---

## TypeScript Types

```ts
type LocationType = 'SHOP' | 'WAREHOUSE' | 'PICKUP_POINT' | 'HOME_BASED' | 'DISTRIBUTION_CENTER';
type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type FulfillmentCapability = 'pickup' | 'delivery' | 'shipping';

interface GeoRef {
  id: string;
  code: string;
  name: string;
}

interface LocationAddress {
  street?: string;
  ward?: string;
  district?: string;
  region: string;
  postalCode?: string;
  country: string;
  countryId?: string;
  regionId?: string;
  districtId?: string;
  wardId?: string;
  streetId?: string;
  locality?: string;
  directions?: string;
}

interface LocationDto {
  id: string;
  sellerId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  address: LocationAddress;
  fulfillmentCapabilities: FulfillmentCapability[];
  locationCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  staffCount: number | null;
  deliveryCoverageRadiusKm: number | null;
  coordinates: { latitude: number; longitude: number };
  isPrimary: boolean;
  isActive: boolean;
  operatingHours: Record<string, string> | null;
  notes: string | null;
  displayAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationSummaryMetrics {
  locationId: string;
  warehouseId: string | null;
  staffCount: number | null;
  isActive: boolean;
  isPrimary: boolean;
  fulfillmentCapabilities: FulfillmentCapability[];
  deliveryCoverageRadiusKm: number | null;
  lastActivityAt: string | null;
}

interface LocationDetailPanel {
  location: LocationDto;
  fulfillmentSettings: {
    capabilities: FulfillmentCapability[];
    operatingHours: Record<string, string> | null;
    isPrimary: boolean;
    isActive: boolean;
    contactName: string | null;
    contactPhone: string | null;
    deliveryCoverageRadiusKm: number | null;
  };
  inventory: {
    warehouseId: string | null;
    note: string;
  };
}

interface SearchResponse {
  locations: LocationDto[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## Geographic Hierarchy

These populate cascading dropdowns: Country → Region → District → Ward → Street.

### GET /geography/regions

Query: `countryId` (optional) — filters to one country.

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/geography/regions?countryId=tz_001"
```

```json
{
  "success": true,
  "data": [
    { "id": "reg_dsm", "code": "DSM", "name": "Dar es Salaam" },
    { "id": "reg_aru", "code": "ARU", "name": "Arusha" },
    { "id": "reg_mwanza", "code": "MWZ", "name": "Mwanza" }
  ]
}
```

### GET /geography/districts

Query: `regionId` (required).

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/geography/districts?regionId=reg_dsm"
```

```json
{
  "success": true,
  "data": [
    { "id": "dist_ilala", "code": "ILA", "name": "Ilala" },
    { "id": "dist_temeke", "code": "TEM", "name": "Temeke" },
    { "id": "dist_kinondoni", "code": "KIN", "name": "Kinondoni" }
  ]
}
```

Error when `regionId` is missing:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "regionId is required",
    "timestamp": "2026-10-18T10:00:00Z",
    "path": "/api/catalog/seller-locations/geography/districts"
  }
}
```

### GET /geography/wards

Query: `districtId` (required).

```json
{
  "success": true,
  "data": [
    { "id": "ward_kivukoni", "code": "KIV", "name": "Kivukoni" },
    { "id": "ward_kariakoo", "code": "KRK", "name": "Kariakoo" }
  ]
}
```

### GET /geography/streets

Query: `wardId` (required).

```json
{
  "success": true,
  "data": [
    { "id": "str_uhuru", "code": "UHR", "name": "Uhuru Street" },
    { "id": "str_samora", "code": "SMR", "name": "Samora Avenue" }
  ]
}
```

Note: an empty `data: []` array is valid — it means no official street data for
that ward. Use the manual `locality` / `directions` fields instead of `streetId`.

### GET /geography/validate

Query: any subset of `countryId`, `regionId`, `districtId`, `wardId`,
`streetId`. Validates that the parent-child chain is consistent.

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/geography/validate?regionId=reg_dsm&districtId=dist_ilala"
```

```json
{ "success": true, "data": { "valid": true } }
```

```json
{ "success": true, "data": { "valid": false } }
```

Call this before submitting a location form to catch hierarchy mismatches
early.

---

## Location CRUD

### POST / — Create Location

Headers:
```
Authorization: Bearer <token>
Idempotency-Key: <unique-key>     REQUIRED — see Idempotency section
Content-Type: application/json
```

Request body — full example (all optional fields shown):

```json
{
  "name": "Kariakoo Shop",
  "type": "SHOP",
  "street": "Kariakoo Market",
  "ward": "Kivukoni",
  "district": "Ilala",
  "region": "Dar es Salaam",
  "country": "Tanzania",
  "postalCode": "11101",
  "countryId": "tz_001",
  "regionId": "reg_dsm",
  "districtId": "dist_ilala",
  "wardId": "ward_kivukoni",
  "streetId": "str_uhuru",
  "locality": "Near the mosque",
  "directions": "Behind the main market entrance, gate 3",
  "latitude": -6.8167,
  "longitude": 39.2833,
  "fulfillmentCapabilities": ["pickup", "delivery"],
  "isPrimary": true,
  "operatingHours": {
    "mon": "08:00-18:00",
    "tue": "08:00-18:00",
    "wed": "08:00-18:00",
    "thu": "08:00-18:00",
    "fri": "08:00-18:00",
    "sat": "08:00-14:00"
  },
  "notes": "Flagship shop",
  "contactName": "Emmanuel Mollel",
  "contactPhone": "+255754892120",
  "staffCount": 6,
  "deliveryCoverageRadiusKm": 5.5
}
```

Field rules:

| Field | Required | Type | Validation |
|-------|----------|------|-----------|
| `name` | yes | string | non-empty |
| `type` | no (default `SHOP`) | `SHOP` \| `WAREHOUSE` \| `PICKUP_POINT` \| `HOME_BASED` \| `DISTRIBUTION_CENTER` | enum |
| `street` | one of `street`/`locality`/`directions` | string | |
| `locality` | one of `street`/`locality`/`directions` | string | free-text fallback |
| `directions` | one of `street`/`locality`/`directions` | string | practical directions fallback |
| `region` | yes | string | non-empty |
| `country` | no (default `Tanzania`) | string | |
| `latitude` | yes | number | -12.0 … 0.5 (Tanzania) |
| `longitude` | yes | number | 28.0 … 41.0 (Tanzania) |
| `countryId` / `regionId` / `districtId` / `wardId` / `streetId` | no | string | if any provided, parent-child chain must be valid |
| `fulfillmentCapabilities` | no | string[] | `pickup` \| `delivery` \| `shipping` |
| `isPrimary` | no (default auto) | boolean | first location is auto-set primary |
| `operatingHours` | no | Record<string,string> | e.g. `{ "mon": "08:00-18:00" }` |
| `contactName` | no | string | |
| `contactPhone` | no | string | Tanzania format: `+255...` or `0...` or `255...` |
| `staffCount` | no | number | non-negative integer |
| `deliveryCoverageRadiusKm` | no | number | non-negative |

Rules enforced:
- Max 10 active locations per seller.
- Exactly one `isPrimary` per seller. Setting `isPrimary: true` clears the previous primary.
- `locationCode` is generated automatically as `LOC-{REGION_CODE}-{SEQ}` (e.g. `LOC-DSM-001`).

Response `201`:

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
      "postalCode": "11101",
      "country": "Tanzania",
      "countryId": "tz_001",
      "regionId": "reg_dsm",
      "districtId": "dist_ilala",
      "wardId": "ward_kivukoni",
      "streetId": "str_uhuru",
      "locality": "Near the mosque",
      "directions": "Behind the main market entrance, gate 3"
    },
    "fulfillmentCapabilities": ["pickup", "delivery"],
    "locationCode": "LOC-DSM-001",
    "contactName": "Emmanuel Mollel",
    "contactPhone": "+255754892120",
    "staffCount": 6,
    "deliveryCoverageRadiusKm": 5.5,
    "coordinates": { "latitude": -6.8167, "longitude": 39.2833 },
    "isPrimary": true,
    "isActive": true,
    "operatingHours": { "mon": "08:00-18:00", "tue": "08:00-18:00" },
    "notes": "Flagship shop",
    "displayAddress": "Kariakoo Market, Kivukoni, Ilala, Dar es Salaam, Tanzania",
    "createdAt": "2026-10-18T10:00:00.000Z",
    "updatedAt": "2026-10-18T10:00:00.000Z"
  }
}
```

Common errors:

```jsonc
// 400 — missing Idempotency-Key header
{ "error": { "code": "MALFORMED_REQUEST", "message": "Missing idempotency key" } }

// 422 — outside Tanzania bounds
{ "error": { "code": "VALIDATION_ERROR", "message": "Latitude 45 is outside Tanzania bounds [-12, 0.5]" } }

// 422 — invalid geography chain
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid geographic ID hierarchy" } }

// 422 — bad phone
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid contact phone format" } }

// 422 — over the limit
{ "error": { "code": "BUSINESS_RULE_VIOLATION", "message": "Seller may have at most 10 active locations" } }
```

### GET / — List Locations

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/"
```

Response `200` — array of `LocationDto`, primary first:

```json
{
  "success": true,
  "data": [
    { "id": "sloc_abc123", "name": "Kariakoo Shop", "type": "SHOP", "isPrimary": true, "...": "..." },
    { "id": "sloc_def456", "name": "Mbezi Warehouse", "type": "WAREHOUSE", "isPrimary": false, "...": "..." }
  ]
}
```

### GET /:locationId — Get One Location

Response `200` — single `LocationDto` (same shape as POST response `data`).
`404` if not found. `403` if the location belongs to another seller.

### PUT /:locationId — Update Location

Headers: same as POST (including `Idempotency-Key`).

Request body — send only the fields to change:

```json
{
  "name": "Kariakoo Main Branch",
  "contactPhone": "0754892120",
  "staffCount": 8,
  "deliveryCoverageRadiusKm": 12,
  "operatingHours": { "mon": "07:00-20:00" }
}
```

All fields from POST are accepted (all optional here). Geographic hierarchy
re-validation runs if any `*Id` field is present. Setting `isActive: false` is
rejected with `422` if the linked warehouse still holds stock.

Response `200` — updated `LocationDto`.

### PATCH /:locationId/deactivate — Soft Deactivate

```bash
curl -X PATCH -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/sloc_abc123/deactivate"
```

Response `200` — `LocationDto` with `isActive: false`, `status: "INACTIVE"`.

Blocked with `422` if the linked inventory warehouse still has stock:

```json
{ "error": { "code": "BUSINESS_RULE_VIOLATION", "message": "Cannot deactivate location with existing stock. Transfer or deplete stock first." } }
```

### PATCH /:locationId/activate — Reactivate

```bash
curl -X PATCH -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/sloc_abc123/activate"
```

Response `200` — `LocationDto` with `isActive: true`, `status: "ACTIVE"`.

### DELETE /:locationId — Hard Delete (Admin Only)

```bash
curl -X DELETE -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/sloc_abc123"
```

Response `204` (no body). Requires the `admin` role — seller accounts get `403`.
Physical stock in inventory-service is not affected.

---

## Search & Export

### GET /search — Search / Filter / Paginate

Query parameters:

| Param | Type | Example | Notes |
|-------|------|---------|-------|
| `q` | string | `?q=kariakoo` | Matches name, street, ward, district, region, locality |
| `type` | string | `?type=WAREHOUSE` | LocationType enum |
| `status` | string | `?status=ACTIVE` | ACTIVE / INACTIVE / SUSPENDED |
| `isActive` | string | `?isActive=true` | `"true"` or `"false"` |
| `regionId` | string | `?regionId=reg_dsm` | Filter by geography region |
| `districtId` | string | `?districtId=dist_ilala` | Filter by geography district |
| `wardId` | string | `?wardId=ward_kivukoni` | Filter by geography ward |
| `streetId` | string | `?streetId=str_uhuru` | Filter by geography street |
| `page` | number | `?page=2` | default 1 |
| `pageSize` | number | `?pageSize=50` | default 20 |
| `export` | string | `?export=csv` | triggers CSV download (below) |

Example:

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/search?q=kariakoo&type=SHOP&isActive=true&page=1&pageSize=20"
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "locations": [ { "...": "LocationDto[]" } ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### GET /search?export=csv — CSV Download

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/search?isActive=true&export=csv" --output locations.csv
```

Response `200`:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="seller-locations.csv"`

Columns (26): `locationId, sellerId, name, type, status, locationCode,
contactName, contactPhone, staffCount, deliveryCoverageRadiusKm, street, ward,
district, region, postalCode, country, locality, directions, latitude,
longitude, isPrimary, isActive, fulfillmentCapabilities, operatingHours,
createdAt, updatedAt`

`fulfillmentCapabilities` is joined with `;` (e.g. `pickup;delivery`).
`operatingHours` is a JSON string.

---

## Metrics & Detail Panel

### GET /:locationId/metrics — Summary Metrics

```json
{
  "success": true,
  "data": {
    "locationId": "sloc_abc123",
    "warehouseId": "wh_def456",
    "staffCount": 6,
    "isActive": true,
    "isPrimary": true,
    "fulfillmentCapabilities": ["pickup", "delivery"],
    "deliveryCoverageRadiusKm": 5.5,
    "lastActivityAt": "2026-10-18T10:00:00.000Z"
  }
}
```

`warehouseId` links to inventory-service — use it to fetch stock from
`/api/inventory/warehouses`. It is `null` if no warehouse has been provisioned yet.

### GET /:locationId/detail — Detail Panel

```json
{
  "success": true,
  "data": {
    "location": { "...full LocationDto..." },
    "fulfillmentSettings": {
      "capabilities": ["pickup", "delivery"],
      "operatingHours": { "mon": "08:00-18:00" },
      "isPrimary": true,
      "isActive": true,
      "contactName": "Emmanuel Mollel",
      "contactPhone": "+255754892120",
      "deliveryCoverageRadiusKm": 5.5
    },
    "inventory": {
      "warehouseId": "wh_def456",
      "note": "Physical stock lives in inventory-service. Query /api/inventory/stock-outs and /api/inventory/warehouses for stock data."
    }
  }
}
```

### GET /:locationId/report/pdf — PDF Report Download

```bash
curl -H "Authorization: Bearer <token>" \
  "/api/catalog/seller-locations/sloc_abc123/report/pdf" --output report.pdf
```

Response `200`:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="location-{id}-report.pdf"`

The PDF contains: location info, contact/fulfillment settings, stock-by-product
table (from the location detail), and the inventory warehouse link.

---

## Idempotency (POST / and PUT /:locationId)

Both mutation endpoints require an `Idempotency-Key` header. Use a unique
string per logical operation (e.g. `loc-create-<sellerId>-<timestamp>` or a
UUID). Keys are cached for 24 hours.

| Scenario | Result |
|----------|--------|
| First request with key | Normal processing, response cached |
| Retry with same key | Cached response replayed (same status + body, no side effects) |
| Two concurrent requests with same key | First proceeds; second gets `409 Conflict` |
| No key provided | `400 Bad Request` |

```bash
curl -X POST "/api/catalog/seller-locations" \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 6f1c8e2a-loc-create-001" \
  -H "Content-Type: application/json" \
  -d '{"name":"...", "region":"Dar es Salaam", "latitude":-6.8, "longitude":39.2, ...}'
```

Retry the exact same call with the same key — you get the same `201` response
without creating a duplicate location.

---

## Error Codes

| HTTP | `error.code` | When |
|------|--------------|------|
| 400 | `VALIDATION_ERROR` | Missing required field, missing `regionId` on geography lookup |
| 400 | `MALFORMED_REQUEST` | Missing `Idempotency-Key` on POST/PUT |
| 401 | `MISSING_TOKEN` / `INVALID_TOKEN` | No or bad JWT |
| 403 | `INSUFFICIENT_PERMISSIONS` | Not the owner, or non-admin DELETE |
| 404 | `RESOURCE_NOT_FOUND` | Location ID does not exist |
| 409 | `RESOURCE_CONFLICT` | Idempotency lock held by a concurrent request |
| 422 | `VALIDATION_ERROR` | Out-of-bounds coordinates, bad phone, invalid geography chain |
| 422 | `BUSINESS_RULE_VIOLATION` | Deactivate with stock, over 10 active locations |

---

## Frontend Wiring Cheatsheet

1. **Cascading geography picker** — call `/geography/regions` on mount, then
   `/geography/districts?regionId=` when a region is chosen, then wards, then
   streets. If streets return `[]`, show the `locality` + `directions` inputs
   instead of the street dropdown.
2. **Validate before submit** — call `/geography/validate` with the selected
   `countryId/regionId/districtId/wardId/streetId` and block submission if
   `valid: false`.
3. **Create/update** — always attach a fresh `Idempotency-Key`; on network
   retry, reuse the SAME key so the backend replays the cached result.
4. **Detail panel** — use `GET /:id/detail` for the right-hand panel and
   `GET /:id/metrics` for the top summary chips.
5. **Stock numbers** — never fetch them from catalog. Read `data.inventory.warehouseId`
   from the detail response, then call inventory-service (`/api/inventory/...`)
   with that warehouse ID.
6. **Exports** — link/button to `/search?export=csv` (browser will download the
   attachment); `/report/pdf` for the per-location PDF.
