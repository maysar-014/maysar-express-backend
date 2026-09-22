# Seller Guide — Inventory Service

> Mirrors: `docs/FLOWS/inventory/user-flow/seller-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Inventory management UI for sellers: stock level display, stock adjustments, and understanding automatic reservations.

---

## Flow 1: Check Stock Level

**Action:** `GET /api/inventory/stock/:variantId`

**UI States:** Loading | Stock displayed | Not found (no record yet) | Error

Display:
- **Available:** `available` (= `quantity − reserved`) — this is what can be sold
- **Reserved:** `reserved` — held for confirmed orders (do not count as available)
- Show low stock warning if `available < threshold` (e.g., < 5 units)

Never show raw `quantity` as available stock when `reserved > 0`.

---

## Flow 2: Adjust Stock

**Action:** `POST /api/inventory/stock/adjust`

**UI States:** Form | Loading | Success | Validation error | Error

Show: adjustment type (INCREMENT / DECREMENT / SET), quantity input, reason field.

For DECREMENT: show a confirmation if the adjustment would bring `available` to zero or below. Never allow decrement below zero — 422 `INSUFFICIENT_STOCK` if attempted.

---

## Flow 3: Stock Reservation (Informational)

Stock reservations happen automatically:
- `OrderCreated.v1` → `reserved` increases (stock held for the order)
- `OrderCancelled.v1` → `reserved` decreases (stock released)
- `OrderDelivered` → reservation consumed permanently

The seller sees this as changes in the `reserved` field. Show "X units reserved for active orders" as a label beneath the available count.
