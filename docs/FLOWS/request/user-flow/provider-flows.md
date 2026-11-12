# Provider (Ops) Flows — Request Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-12, LC-13)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-12/LC-13 (2026-11-06); `services/request-service` test suite (September 2026)
> **Last updated:** 2026-11-06 (corrected: MSS-005 sourcing endpoint paths updated to match live routes)

## Overview

Provider/ops flows for the request service: reviewing submitted requests, assessing feasibility, sourcing items from suppliers, creating and publishing quotes, and generating the secure assessment link for buyer acceptance.

**Authentication:** Bearer JWT with `provider`, `admin`, or `ops` role on all provider routes.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Request Inbox | Verified | `GET /api/request/provider/requests` |
| 2 | Assign Request | Verified | `POST /api/request/provider/requests/:requestId/assign` |
| 3 | Assess Request (Fulfillable / Unfulfillable) | Verified | `POST /api/request/provider/requests/:requestId/assess` |
| 4 | Register and Manage Suppliers (Phase 2) | Verified | `POST /api/request/provider/suppliers` |
| 5 | Set Item Source (Phase 2) | Verified | `POST /api/request/provider/requests/:requestId/items/:itemId/source` |
| 6 | Create Quote | Verified | `POST /api/request/provider/requests/:requestId/quotes` |
| 7 | Publish Quote (Sourcing Gate) | Verified | `POST /api/request/provider/quotes/:quoteId/publish` |
| 8 | Generate Assessment Link | Verified | `POST /api/request/provider/quotes/:quoteId/assessment-link` |
| 9 | View Procurement Status (Phase 2) | Verified | `GET /api/request/provider/procurement/orders/:orderId` |

---

## Flow 1: View Request Inbox

**Action:** `GET /api/request/provider/requests?status=&page=&limit=`

Returns all requests (not scoped to a single customer). Filter by status to triage the queue.

---

## Flow 2: Assign Request

**Action:** `POST /api/request/provider/requests/:requestId/assign`

Sets `assignedProviderId` on the request. Transitions request to `ASSESSING` status.

---

## Flow 3: Assess Request

**Action:** `POST /api/request/provider/requests/:requestId/assess`

Two outcomes:
- `FULFILLABLE` — provider can source all items; emits `request.fulfillable`; enables quote creation
- `UNFULFILLABLE` — cannot be sourced; emits `request.unfulfillable` with reason; **dead end** (cannot be quoted)

Request body: `{ "decision": "FULFILLABLE" }` or `{ "decision": "UNFULFILLABLE", "reason": "Supplier unavailable for this spec" }`

### Unhappy Path
- `UNFULFILLABLE` requests cannot be quoted — `CreateQuoteUseCase` blocks this
- Invalid decision value → 400

---

## Flow 4: Register Supplier (Phase 2)

**Action:** `POST /api/request/provider/requests/suppliers`

> ⚠️ **MSS-005 corrected 2026-11-06:** Live route is `/api/request/provider/requests/suppliers` (with the `requests/` segment), NOT `/api/request/provider/suppliers`. Calling the old path returns 404.

Adds a third-party supplier to the registry. Suppliers have no auth account and are never customer-facing.

**Request body:**
```json
{
  "name": "Supplier Name",
  "contact": { "phone": "+255700000000" }
}
```

Returns: `{ id: "sup_...", name: "..." }`

**Important:** Suppliers (`source: KNOWN | DISCOVERED`) are Maysar-internal only — buyers never see supplier names or details.

---

## Flow 5: Set Item Source (Phase 2)

**Action:** `POST /api/request/provider/requests/items/:itemId/sources`

> ⚠️ **MSS-005 corrected 2026-11-06:** Live route is `.../items/:itemId/sources` (plural), NOT `.../items/:itemId/source` (singular). Also: the `:requestId` segment is NOT in the path — items are addressed directly by `itemId`.

Attaches a source to a request item. Source types:
- `CATALOG_PRODUCT` — from Maysar catalog
- `KNOWN_SUPPLIER` — registered supplier with `CONFIRMED` availability
- `EXTERNAL_SUPPLIER` — new supplier
- `MAYSAR_INVENTORY` — from Maysar stock (`supplierId` = null)

**Sourcing gate:** `PublishQuoteUseCase` will refuse to publish until every item has a source with `availability === 'CONFIRMED'`.

**To confirm a source after attaching it:**
`POST /api/request/provider/requests/sources/:sourceId/confirm`

```json
{
  "availableUntil": "2026-12-01T00:00:00Z"
}
```

This transitions the source from `PENDING` → `CONFIRMED`. Until all item sources are confirmed, `POST /api/request/provider/requests/quotes/:quoteId/publish` returns 422 `SOURCING_INCOMPLETE`.

---

## Flow 6: Create Quote

**Action:** `POST /api/request/provider/requests/:requestId/quotes`

Creates a DRAFT quote. Invariants enforced at creation:
- `sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs`
- `validUntil` must be in the future
- Items array must be non-empty

Request body:
```json
{
  "items": [{ "description": "...", "quantity": 50, "unitPriceTzs": 8000 }],
  "procurementCostTzs": 350000,
  "logisticsCostTzs": 50000,
  "sellingPriceTzs": 450000,
  "validUntil": "2026-10-15T00:00:00Z",
  "notes": "Custom print with 5-day turnaround"
}
```

Returns: `{ quoteId: "RQO-...", status: "DRAFT" }`

---

## Flow 7: Publish Quote (Sourcing Gate)

**Action:** `POST /api/request/provider/requests/quotes/:quoteId/publish`

> ⚠️ **MSS-005 corrected 2026-11-06:** Live route is `/api/request/provider/requests/quotes/:quoteId/publish` (with `requests/` prefix), NOT `/api/request/provider/quotes/:quoteId/publish`.

**Sourcing gate:** every item in the quote must have a `CONFIRMED` source before publish succeeds. If any item lacks a confirmed source, publish returns 422.

On success:
- Quote transitions `DRAFT → PUBLISHED` (immutable — never mutates again)
- Request transitions to `QUOTE_PUBLISHED`
- `quote.published` event emitted
- Quote is now visible to the buyer via `GET /api/request/requests/:requestId/quotes`

A repriced quote creates a **new** DRAFT quote and supersedes the old one — the old quote row is never mutated.

### Unhappy Path
| Trigger | Response | Error Code |
|---|---|---|
| One or more items have no `CONFIRMED` source | 422 | `SOURCING_INCOMPLETE` |
| Quote already PUBLISHED | 422 | `INVALID_STATUS_TRANSITION` |
| Quote is DRAFT but `validUntil` already elapsed | 422 | `QUOTE_EXPIRED` |

---

## Flow 8: Generate Assessment Link

**Action:** `POST /api/request/provider/quotes/:quoteId/assessment-link`

Generates a single-use secure link for the buyer to review and accept the quote.

**Security:**
- Raw token generated and returned **exactly once** — store it immediately, it is never retrievable again
- Only SHA-256 `tokenHash` stored in the database
- Link has a TTL; status: `ACTIVE → USED | EXPIRED`

Returns: `{ token: "raw-token-for-sharing", linkId: "RAL-...", expiresAt: "..." }`

**Provider shares the token** with the buyer (e.g., via the conversation thread). The buyer uses it at `GET /api/request/requests/assess/:token`.

---

## Flow 9: View Procurement Status (Phase 2)

**Action:** `GET /api/request/provider/procurement/orders/:orderId`

After a request converts to an order, procurement records track each item's sourcing status:
`PENDING → ORDERED → RECEIVED | FAILED`

**Advance procurement:** `POST /api/request/provider/procurement/orders/:orderId/advance`

Procurement is Maysar-internal — buyers never see procurement records.
