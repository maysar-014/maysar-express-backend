# Maysar Inventory Service — Implementation Reference (As-Built)

> **Status:** Live and verified — stock reservation lifecycle, Redlock-protected concurrent reservations, reconciliation.
> **Last updated:** September 2026
> **Scope:** `services/inventory-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Reservations use Redlock** | `InventoryReservationService` acquires a distributed Redis lock before modifying stock — prevents overselling under concurrent load |
| **Reservation lifecycle is explicit** | `PENDING → CONFIRMED | RELEASED | EXPIRED` — no implicit state changes |
| **Stock is per-seller per-product** | Each seller manages their own stock independently |
| **Reconciliation is scheduled** | A reconciliation job detects and corrects drift between reservation records and actual stock |
| **Reservation expiry is automatic** | Unconfirmed reservations expire after a configurable TTL (default 30 minutes) |

---

## 2. Domain Model

### InventoryItem Entity

Fields: `itemId`, `productId`, `sellerId`, `stockCount`, `reservedCount`, `availableCount` (`stockCount - reservedCount`), `lowStockThreshold`, `version` (optimistic lock).

### Reservation Entity

```
ReservationStatus: PENDING → CONFIRMED | RELEASED | EXPIRED
```

Fields: `reservationId`, `itemId`, `orderId`, `quantity`, `status`, `expiresAt`, `confirmedAt`.

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `ReserveStockUseCase` | Acquires Redlock → checks available stock → creates PENDING reservation |
| `ConfirmReservationUseCase` | Transitions PENDING → CONFIRMED; decrements `stockCount` |
| `ReleaseReservationUseCase` | Transitions to RELEASED; restores `reservedCount` |
| `ExpireReservationsUseCase` | Scheduled job — expires PENDING reservations past TTL |
| `UpdateStockUseCase` | Seller updates stock count |
| `GetStockUseCase` | Returns current stock + available count |
| `ReconcileInventoryUseCase` | Detects and corrects reservation/stock drift |

---

## 4. HTTP Surface

Mounted at `/api/inventory` (module name `inventory-service` → strip `-service` → `/api/inventory`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/inventory/stock/:variantId` | JWT | Stock for a variant (all warehouses) |
| PUT  | `/api/inventory/stock/:variantId/:warehouseId` | JWT (admin/warehouse) | Manual stock adjustment |
| GET  | `/api/inventory/materials` | JWT | List materials |
| GET  | `/api/inventory/materials/:variantId` | JWT | Material detail |
| PUT  | `/api/inventory/materials/:variantId/warehouses/:warehouseId` | JWT | Update material inventory |
| POST | `/api/inventory/reservations` | JWT | Reserve stock |
| GET  | `/api/inventory/reservations/:orderId` | JWT | Get reservations for order |
| DELETE | `/api/inventory/reservations/:orderId` | JWT | Cancel reservations for order |
| GET  | `/api/inventory/warehouses` | JWT | List warehouses |
| GET  | `/api/inventory/warehouses/:id` | JWT | Get warehouse |
| POST | `/api/inventory/inventory-counts` | JWT | Start inventory count |
| PUT  | `/api/inventory/inventory-counts/:countId` | JWT | Complete inventory count |
| GET  | `/api/inventory/analytics/stock-levels` | JWT | Stock analytics |
| GET  | `/api/inventory/health` | none | Health check |

---

## 5. Events

| Event | Emitted by | Payload |
|---|---|---|
| `inventory.reserved` | `ReserveStockUseCase` | `reservationId, itemId, orderId, quantity` |
| `inventory.confirmed` | `ConfirmReservationUseCase` | `reservationId, itemId, orderId` |
| `inventory.released` | `ReleaseReservationUseCase` | `reservationId, itemId, orderId, quantity` |
| `inventory.low_stock` | Stock update | `itemId, productId, sellerId, currentStock` |
| `inventory.out_of_stock` | Stock update | `itemId, productId, sellerId` |

Events consumed:
- `order.placed` → `ReserveStockUseCase`
- `order.confirmed` → `ConfirmReservationUseCase`
- `order.cancelled` → `ReleaseReservationUseCase`

---

## 6. Frontend Integration Guide

### Stock management (seller)

`GET /api/inventory/stock/:variantId` — stock levels across warehouses for a product variant.

```jsonc
{
  "variantId": "var_01...",
  "stockLevels": [
    {
      "warehouseId": "wh_01...",
      "warehouseName": "Dar es Salaam Main",
      "available": 12,
      "reserved": 3,
      "status": "in_stock"
    }
  ],
  "totalAvailable": 12,
  "totalReserved": 3,
  "lastUpdated": "2026-09-01T10:00:00Z"
}
```

### Update stock

`PUT /api/inventory/stock/:variantId/:warehouseId`

```jsonc
{ "quantity": 20, "operation": "add", "reason": "Received new shipment" }
```

`operation`: `add` | `subtract` | `set`. `reason` is required.

### Low stock alerts

When `available <= reorderPoint`, the item has `status: "low_stock"`. Show a warning badge in the seller's product list.

When `available === 0`, the item has `status: "out_of_stock"`. The catalog service automatically hides this listing from search results.

### Integration checklist

- [ ] Show stock level in seller product list with low-stock warning
- [ ] Show "Out of stock" badge on product detail when `available === 0`
- [ ] Send push notification to seller when stock goes below threshold
- [ ] Show reserved count separately from available count in seller dashboard
- [ ] Handle `Stock reservation failed` (409) in checkout with "Item no longer available" message
- [ ] Reservation TTL is 30 minutes — if checkout takes longer, stock may be released


---

## System Maintenance Routes

Mounted at `/api/inventory/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/inventory/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable inventory outbox events |
| POST | `/api/inventory/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
