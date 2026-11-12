# ADR-001: Single Authoritative Inventory Source

**Status:** Accepted  
**Date:** 2026-10-18  
**Scope:** Location Management System — Epic E3 (backlog item E3-4)  
**Context:** Two separate Prisma tables currently track product-location stock.

---

## 1. Current State (verified in codebase)

| Concern | `Catalog_ProductLocation` | `Inventory_StockItem` |
|---|---|---|
| Owner | catalog-service (seller-facing) | inventory-service (warehouse ops) |
| Grain | `(productId, locationId)` → seller location | `(productVariantId, warehouseId)` → warehouse |
| Quantities | available, reserved, unavailable, in-transit, reorderPoint, maxStock, unitCost | available, reserved, unavailable, in-transit, damaged, on-order, reorderPoint, maxStock, unitCost, batch, expiry, locationCode |
| Transfers | `Catalog_StockTransfer` (PENDING → APPROVED → IN_TRANSIT → RECEIVED / CANCELLED) | `Inventory_InventoryMovement` + `inventory_Reservation` (reserve / fulfil / release in transaction) |
| Consumers | checkout fulfillment selector (`findAvailableLocationsForProduct` → `netAvailable > 0`, distance sort), checkout `inventory-reservation.service.ts` (`checkout_InventoryReservation`), order placement reads seller pickup from `catalog_SellerLocation` (`place-order.use-case.ts`) | `inventoryService.ts` + `reservationEngine.ts` + `warehouseManager.ts` (warehouse-scoped reserve/release) |
| Buyer-address branch | — | — |

Catalog (seller-location) and warehouse (inventory) stock are tracked independently with
overlapping quantity semantics. No cross-table reconciliation exists. This ADR resolves
the direction of convergence.

---

## 2. Decision

**`Catalog_ProductLocation` is the canonical seller-location inventory source of truth.**
`Inventory_StockItem` is retained as an operational extension for warehouse-centric
processes (batch, expiry, serial/quality, putaway, cycle counts) and is linked to
canonical net-available figures, not independently authoritative for seller location stock.

Rationale:

1. Fulfillment and checkout decisions (eligible location, proximity selection, order
   `fulfillmentLocationId`) already read exclusively from `Catalog_ProductLocation`.
2. Seller-location CRUD, geography linkage, fulfillment capabilities, and the location
   directory/detail surfaces all live in the catalog domain.
3. `Catalog_ProductLocation` grain `(productId, locationId)` matches the Seller OS
   location model; `Inventory_StockItem` grain `(productVariantId, warehouseId)` does
   not map 1:1 to seller locations and cannot be a drop-in replacement without a
   warehouse↔location mapping layer that does not exist.

Non-goals: deleting or deprecating the warehouse tables. Warehouse operations are a
distinct concern (batch/expiry/quality/putaway) with no seller-location equivalent.

---

## 3. Migration Path (phased, no data loss)

### Phase A — Reconciliation reporting (read-only)

1. Nightly job compares `Catalog_ProductLocation.netAvailable` against the summed
   `Inventory_StockItem` available/reserved/unavailable for the linked warehouse.
2. Discrepancies surface in location metrics (`stockSyncStatus: in_sync | drifted`).
3. No writes; establishes a drift baseline.

### Phase B — Reconciliation API

1. `GET /:locationId/stock-reconciliation` returns per-product canonical vs warehouse
   figures and drift flags.
2. Sellers view, do not yet auto-resolve.

### Phase C — Warehouse sync adapter

1. `Inventory_StockItem` writes publish domain events; catalog consumes them into a
   reconciliation queue.
2. Explicit human approve step applies catalog-side adjustments (keeps seller intent
   authoritative).

### Phase D — Canonical reads everywhere

1. Checkout `inventory-reservation.service.ts` reads canonical `Catalog_ProductLocation`
   and delegates warehouse-specific mutations (batch/expiry) to inventory-service
   via DTO — never entities.
2. `place-order.use-case.ts` stock validation calls the same canonical selector.

Each phase is independently shippable; rollback is a feature-flag toggle.

---

## 4. Alternatives Considered

| Alternative | Rejected because |
|---|---|
| Make `Inventory_StockItem` canonical | Grain mismatch (variant×warehouse ≠ product×seller-location); requires a mapping layer; checkout/fulfillment would need a rewrite |
| Merge tables into one | Destructive migration; loses warehouse-specific fields (batch/expiry/quality); breaks inventory-service contracts |
| Keep both independent | Current state; risk of contradictory stock figures was the reason for E3-4 |

---

## 5. Definition of Done (E3-4)

- [x] Current-state evidence recorded with file/line references
- [x] Canonical-table decision with rationale
- [x] Phased, reversible migration path that avoids data loss
- [x] Rejected alternatives documented

Follow-up work (separate stories): implement Phase A reconciliation job + Phase B
`stock-reconciliation` endpoint.
