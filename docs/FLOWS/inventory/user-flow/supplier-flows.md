# Supplier Flows — Inventory Service

> **Verification status:** Partially Verified (routes reachable with auth; no role-specific gates on inventory routes)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/inventory/INVENTORY_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/inventory/user-flow/supplier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/inventory/frontend-guide/supplier-guide.md`

## Overview

This document covers inventory-service flows from the supplier's perspective: checking and adjusting stock for produced goods, managing per-warehouse material stock, viewing warehouses, running inventory counts, and understanding the reservation lifecycle that runs during bulk fulfillment.

> ⚠️ **Authorization note (verified):** inventory routes are mounted behind `requireAuth` only — there is **no role gate or ownership filter** on `GET/PUT /stock/*`, `/materials/*`, `/reservations/*`, `/warehouses/*`, or `/inventory-counts/*` (confirmed in `services/inventory-service/index.ts` and by the sweep, where a `buyer`-role probe reached handler validation instead of receiving 403). Any authenticated role can call these endpoints. The UI must therefore scope which variants a supplier sees to their own products — the API does not do it for them.

Supplier stock lifecycle context: production plans that reach `READY` are expected to sync into inventory (`production.plan_ready` → inventory-service) — **Partially Verified**, the event subscription is not confirmed in `docs/SERVICE_DEPENDENCY_MAP.md`.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Check Stock Level | Partially Verified | `GET /api/inventory/stock/:variantId` |
| 2 | Adjust Stock | Partially Verified | `PUT /api/inventory/stock/:variantId/:warehouseId` |
| 3 | View Material Stock | Partially Verified | `GET /api/inventory/materials` |
| 4 | Update Material Inventory | Partially Verified | `PUT /api/inventory/materials/:variantId/warehouses/:warehouseId` |
| 5 | View Warehouses | Partially Verified | `GET /api/inventory/warehouses` |
| 6 | Run Inventory Count | Partially Verified | `POST /api/inventory/inventory-counts` → `PUT /api/inventory/inventory-counts/:countId` |
| 7 | Stock Reservation (Event-Driven) | Partially Verified | Triggered by order/production events |

---

## Flow 1: Check Stock Level

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier checks current stock for a produced variant |
| Preconditions | Authenticated (Bearer JWT); `variantId` identifies the product variant |
| Terminal states | 200 — stock record; 404 data-level if no inventory record exists for this variant |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Request stock level | `GET /api/inventory/stock/:variantId` | Bearer JWT | 200 `{ variantId, quantity, reserved, available, warehouseId }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| No inventory record for `variantId` | 404 data-level (route exists) | `RESOURCE_NOT_FOUND` |
| JWT missing | 401 | `UNAUTHORIZED` |

---

## Flow 2: Adjust Stock

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier receives a produced batch or writes off damaged goods |
| Preconditions | Authenticated (Bearer JWT); target warehouse known |
| Terminal states | 200 — stock row updated for the variant/warehouse pair |
| Verification status | Partially Verified (sweep: buyer-role probe reached validation → 400, confirming no role gate) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submit stock adjustment for a warehouse | `PUT /api/inventory/stock/:variantId/:warehouseId` | Bearer JWT | 200 — updated stock row `{ variantId, warehouseId, quantity, … }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Quantity would go negative | 422 | `INSUFFICIENT_STOCK` |
| Malformed body | 400 | `VALIDATION_ERROR` |

---

## Flow 3: View Material Stock

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Lists material stock rows | `GET /api/inventory/materials` | Bearer JWT | 200 — list (sweep: 200) |
| 2 | Supplier | Reads one variant's material stock | `GET /api/inventory/materials/:variantId` | Bearer JWT | 200 — record |

---

## Flow 4: Update Material Inventory

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Sets material quantity in a warehouse | `PUT /api/inventory/materials/:variantId/warehouses/:warehouseId` | Bearer JWT | 200 — updated row (sweep: buyer probe → 400 validation, route reachable) |

---

## Flow 5: View Warehouses

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Lists warehouses | `GET /api/inventory/warehouses` | Bearer JWT | 200 — warehouse list |
| 2 | Supplier | Reads one warehouse | `GET /api/inventory/warehouses/:id` | Bearer JWT | 200 — detail; 404 data-level if unknown |

---

## Flow 6: Run Inventory Count

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier performs a physical stock count and reconciles discrepancies |
| Preconditions | Authenticated (Bearer JWT); count record created before completion |
| Terminal states | Count opened → completed with discrepancy record |
| Verification status | Partially Verified (sweep: both routes reached validation → 400, routes reachable) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Starts a count for a warehouse | `POST /api/inventory/inventory-counts` | Bearer JWT | 200/201 — count record `{ countId, warehouseId, countType, countedAt }` |
| 2 | Supplier | Completes the count with results | `PUT /api/inventory/inventory-counts/:countId` | Bearer JWT | 200 — completed; discrepancies recorded |

---

## Flow 7: Stock Reservation (Event-Driven — Background Context)

Not supplier-initiated. Stock is reserved and released automatically via platform events:

| Event | Source | Effect |
|---|---|---|
| `OrderCreated.v1` | order-service | Reserves stock for the ordered variant |
| `OrderCancelled.v1` | order-service | Releases the reservation |
| `production.plan_ready` | production-service | *Expected* to add produced stock — **Partially Verified, subscription unconfirmed** |

Reservation endpoints exist for programmatic access: `POST /api/inventory/reservations`, `GET /api/inventory/reservations/:orderId`, `DELETE /api/inventory/reservations/:orderId` (sweep: GET → 200; write probes → 400 validation). `available = quantity − reserved`.

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/inventory/frontend-guide/supplier-guide.md` | Supplier inventory UI states and error handling |
| `docs/FLOWS/inventory/user-flow/seller-flows.md` | Same surface documented for the seller role |
| `docs/FLOWS/production/user-flow/supplier-flows.md` | Production plans that feed stock into inventory |
| `docs/inventory/INVENTORY_SERVICE_SYSTEM.md` | Authoritative inventory service reference |
| `docs/FLOWS/_verification/analysis-report.md` | September 2026 endpoint sweep — verification evidence |

