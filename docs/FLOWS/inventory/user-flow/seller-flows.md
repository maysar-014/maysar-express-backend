# Seller Flows — Inventory Service

> **Verification status:** Partially Verified (data-level 404s observed in sweep — routes exist)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/inventory/INVENTORY_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers inventory-service flows from the seller's perspective: checking stock levels, adjusting stock, and understanding how stock reservations work automatically via platform events.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Check Stock Level | Partially Verified | `GET /api/inventory/stock/:variantId` |
| 2 | Adjust Stock | Partially Verified | `POST /api/inventory/stock/adjust` |
| 3 | Stock Reservation (Event-Driven) | Partially Verified | Triggered by `OrderCreated.v1` / `OrderCancelled.v1` |
| 4 | View Warehouse | Partially Verified | `GET /api/inventory/warehouses/:id` |

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
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Submit stock adjustment | `POST /api/inventory/stock/adjust` | Bearer JWT | 200 `{ variantId, newQuantity, adjustment, reason }` |

### Request Body

```json
{
  "variantId": "var_01...",
  "quantity": 50,
  "type": "INCREMENT",
  "reason": "New shipment received"
}
```

**Adjustment types:** `INCREMENT` | `DECREMENT` | `SET`

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| `DECREMENT` below zero | 422 | `INSUFFICIENT_STOCK` |
| Invalid `type` | 400 | `VALIDATION_ERROR` |

---

## Flow 3: Stock Reservation (Event-Driven — Background Context)

This flow is not seller-initiated. Stock is reserved and released automatically via platform events.

| Event | Source | Effect |
|---|---|---|
| `OrderCreated.v1` | order-service | inventory-service reserves stock for the ordered variant |
| `OrderCancelled.v1` | order-service | inventory-service releases the stock reservation |
| `OrderDelivered` | logistics-service | reservation remains consumed (stock permanently decremented) |

Sellers see the reserved stock reflected in `GET /api/inventory/stock/:variantId` as the `reserved` field. `available = quantity - reserved`.

---

## Flow 4: View Warehouse

### Summary

| Field | Value |
|---|---|
| Actor | Seller |
| Trigger | Seller checks warehouse details |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states | 200 — warehouse details; 404 data-level if no fixture |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Seller | Fetch warehouse | `GET /api/inventory/warehouses/:id` | Bearer JWT | 200 `{ warehouseId, name, address, capacity }` |
