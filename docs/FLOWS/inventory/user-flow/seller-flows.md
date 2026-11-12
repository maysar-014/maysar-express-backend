# Seller Flows — Inventory Service

> **Verification status:** Verified — Live-verified 2026-11-06 against `run-lifecycle-checks.mjs` (LC-19)
> **Verification basis:** `scripts/verification/run-lifecycle-checks.mjs` LC-19 (2026-11-06); MUVA/MSLE Phase 3 implementation (2026-11-10)
> **Last updated:** 2026-11-10 (added configuration-aware stock note — ENH-001/012)

## Overview

This document covers inventory-service flows from the seller's perspective: checking stock levels, adjusting stock, and understanding how stock reservations work automatically via platform events.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Check Stock Level | Partially Verified | `GET /api/inventory/stock/:variantId` |
| 2 | Adjust Stock | Verified | `PUT /api/inventory/stock/:variantId/:warehouseId` |
| 3 | Stock Reservation (Event-Driven) | Verified | `POST /api/inventory/reservations` + `DELETE /api/inventory/reservations/:orderId` |
| 4 | View Warehouses | Verified | `GET /api/inventory/warehouses` |

---

## Flow 1: Check Stock Level

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller checks current stock for a product variant |
| Preconditions | Authenticated (Bearer JWT, seller role); `variantId` is the seller's product |
| Terminal states | 200 — stock record; 404 data-level if no inventory record for this variant |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Request stock level | `GET /api/inventory/stock/:variantId` | Bearer JWT | 200 `{ variantId, quantity, reserved, available, warehouseId }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| No inventory record for variantId | 404 data-level (route exists) | `RESOURCE_NOT_FOUND` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow 2: Adjust Stock

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller receives new inventory or writes off damaged goods |
| Preconditions | Authenticated (Bearer JWT, seller role); variantId belongs to seller |
| Terminal states | 200 — stock record updated |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submit stock adjustment | `PUT /api/inventory/stock/:variantId/:warehouseId` | Bearer JWT + `idempotency-key` header | 200 `{ variantId, newQuantity, adjustment, reason }` |

> ⚠️ **GAP-011 corrected 2026-11-06:** Previous path was `POST /api/inventory/stock/adjust`. Live endpoint is `PUT /api/inventory/stock/:variantId/:warehouseId`. Pass `default` as the `warehouseId` if no specific warehouse is targeted. The `idempotency-key` header is required.

### Request Body

```json
{
  "adjustment": 1,
  "reason": "lifecycle-test-adjustment"
}
```

**Note:** `adjustment` is a signed integer (positive = increment, negative = decrement). Use `PUT .../default` when no specific warehouse is specified.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| `adjustment` would bring quantity below zero | 422 | `INSUFFICIENT_STOCK` |
| Missing `idempotency-key` header | 400 | `MISSING_IDEMPOTENCY_KEY` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow 3: Stock Reservations

> ✅ **GAP-011 clarified 2026-11-06:** Reservations are both event-driven (automatic) and API-callable.

| Field | Value |
|---|---|
| Actor | Seller (explicit) or platform (event-driven) |
| Trigger | Order placed (event-driven) or seller manually reserves stock for an order |
| Verification status | Verified |

### Explicit Reservation (API)

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Create reservation | `POST /api/inventory/reservations` | Bearer JWT | 200/201 `{ variantId, orderId, quantity, reservedAt }` |
| 2 | Seller | Delete reservation | `DELETE /api/inventory/reservations/:orderId` | Bearer JWT + `idempotency-key` | 200/204 |

**Request body for create:**
```json
{
  "variantId": "var_01...",
  "orderId": "ord_01...",
  "quantity": 1
}
```

**Idempotency — Create:** Calling `POST /api/inventory/reservations` with the same `variantId` + `orderId` combination returns 400 (duplicate reservation). Handle this defensively — the platform may have auto-reserved via event.

**Idempotency — Delete:** `DELETE /api/inventory/reservations/:orderId` requires `idempotency-key` header. Calling delete on an already-released reservation returns 404 — treat as success (idempotent by outcome).

### Event-Driven Reservation (Background Context)

| Event | Source | Effect |
|---|---|---|
| `OrderCreated.v1` | order-service | inventory-service auto-reserves stock |
| `OrderCancelled.v1` | order-service | inventory-service releases the reservation |
| `OrderDelivered` | logistics-service | reservation consumed permanently |

Sellers see `reserved` reflected in `GET /api/inventory/stock/:variantId`. `available = quantity - reserved`.

---

## Flow 4: View Warehouses

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller checks available warehouses |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states | 200 — warehouse list |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch warehouses | `GET /api/inventory/warehouses` | Bearer JWT | 200 `{ warehouses: [...] }` |

---

## Configuration-Aware Stock (Background Context)

> **Added 2026-11-10 — MUVA/MSLE Phase 3 (ENH-001/012)**
> With the introduction of seller offers and configuration definitions, stock can now be tracked at the seller-offer level, not just the variant level. The `CheckoutTransactionBoundaryPolicy` checks stock against the resolved seller offer's `stockAvailable` field during checkout validation.

### How Stock Resolution Works Now

1. **Simple products (no configuration)** — stock is tracked on the variant or seller offer as before
2. **Configurable products** — the seller offer's `configurationCoverage` determines which configurations the offer applies to:
   - `null` — universal coverage (all configurations)
   - `["fingerprint1", "fingerprint2", ...]` — specific configurations only
3. **At checkout** — `CheckoutTransactionBoundaryPolicy.validate()` resolves the active seller offer for the product, checks `stockAvailable >= quantity`, and reports `stockSufficient` in the response

### What This Means for Sellers

- Seller offer stock (`PATCH /api/catalog/v1/seller/offers/{id}/stock`) is the authoritative stock for that offer
- Inventory service stock (`GET /api/inventory/stock/:variantId`) still tracks warehouse-level stock
- The checkout validation uses the seller offer's stock as the primary check; the inventory service stock is used for warehouse-level operations

### Event-Driven Stock Updates

| Event | Source | Effect on Seller Offer Stock |
|---|---|---|
| Order created | checkout-service | Seller offer `stockAvailable` decremented by order quantity |
| Order cancelled | order-service | Seller offer `stockAvailable` restored |
| Seller manual update | seller via API | `stockAvailable` updated to new value |

> **Note:** The inventory service and seller offer stock operate at different levels. Inventory tracks physical warehouse quantities; seller offer stock tracks the seller's commercial commitment. Both must be sufficient for a checkout to succeed.
