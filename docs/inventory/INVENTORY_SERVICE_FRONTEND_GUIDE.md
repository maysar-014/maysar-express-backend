# Inventory Service — Frontend Integration Guide

> Mount path: `/api/inventory`

---

## Business Rules (from domain code)

### Stock entity invariants
- `quantity` cannot be negative
- `availableQuantity` cannot exceed `quantity`
- `availableQuantity + reservedQuantity` must equal `quantity` exactly
- `reserve(n)` throws if `n > availableQuantity`
- `release(n)` throws if `n > reservedQuantity`

### StockPolicy rules
- `canReserve()` requires `requestedQuantity > 0` AND `availableStock >= requestedQuantity`
- `shouldReorder()` = `currentStock <= reorderPoint`
- Reorder quantity = `max(reorderPoint, maxStock) - currentStock`

### Stock status logic
```
availableQuantity <= 0              → out_of_stock
availableQuantity <= reorderPoint   → low_stock
availableQuantity > reorderPoint    → in_stock
```

### Reservation TTL (ReservationEngine)
Reservations expire after **30 minutes** (`REDIS_RESERVATION_TTL_SECONDS = 30 * 60`). After expiry, stock is automatically released back to available.

### Reservation locking
Items are sorted by `variantId` before acquiring locks to prevent deadlocks. Concurrent reservation attempts for the same order are serialised.

### Reservation status values (lowercase DB strings)
`active` | `fulfilled` | `cancelled` | `expired`

### Stock movement history
Last **1000 movements** kept per variant (older entries trimmed automatically).

---

## Route Reference

### Stock

#### Get stock level
```
GET /api/inventory/stock/:variantId?warehouseId=wh_01J...
```
Omit `warehouseId` to get stock across all warehouses.

```jsonc
{
  "variantId": "var_01J...",
  "stockLevels": [
    {
      "warehouseId": "wh_01J...",
      "warehouseName": "Dar es Salaam Main",
      "available": 45,
      "reserved": 5,
      "status": "in_stock"
    }
  ],
  "totalAvailable": 45,
  "totalReserved": 5,
  "lastUpdated": "2026-09-06T10:00:00Z"
}
```

Returns `404` if no stock record exists for the variant.

#### Manual stock adjustment (admin/warehouse)
```
PUT /api/inventory/stock/:variantId/:warehouseId
```
```jsonc
{ "quantity": 20, "operation": "add", "reason": "Received new shipment" }
```
`operation`: `add` | `subtract` | `set`. `reason` is required.

---

### Materials (supplier-facing)

#### List materials
```
GET /api/inventory/materials?warehouseId=wh_01J...&lowStockOnly=true
```

```jsonc
{
  "materials": [
    {
      "variantId": "var_01J...",
      "warehouseId": "wh_01J...",
      "available": 12,
      "reserved": 3,
      "reorderPoint": 20,
      "maxStock": 200,
      "status": "low_stock",
      "utilizationRate": 0.06
    }
  ],
  "total": 1,
  "lowStockCount": 1,
  "outOfStockCount": 0
}
```

`lowStockOnly=true` filters to `low_stock` and `out_of_stock` items only.

#### Get material detail
```
GET /api/inventory/materials/:variantId?warehouseId=wh_01J...
```
Returns empty `materials[]` (not 404) if the material has not been stocked yet.

#### Update material inventory
```
PUT /api/inventory/materials/:variantId/warehouses/:warehouseId
```
```jsonc
{
  "quantity": 50,
  "operation": "add",
  "reason": "Restocked from production",
  "reorderPoint": 25,
  "maxStock": 300
}
```
At least one of `quantity/operation/reason` or `reorderPoint/maxStock` must be provided.

---

### Reservations

#### Create reservation (system/order-service)
```
POST /api/inventory/reservations
X-Idempotency-Key: <uuid-v4>
```
```jsonc
{
  "orderId": "ord_01J...",
  "items": [
    { "orderItemId": "itm_01J...", "productVariantId": "var_01J...", "quantity": 2 }
  ],
  "shippingAddress": { "city": "Dar es Salaam" }
}
```

Success `201`:
```jsonc
{
  "reservationId": "rsv_01J...",
  "status": "confirmed",
  "reservations": [...],
  "expiresAt": "2026-09-06T10:30:00Z"
}
```

Failure `409`:
```jsonc
{
  "error": "Stock reservation failed",
  "unavailableItems": [
    { "productVariantId": "var_01J...", "requested": 2, "available": 1 }
  ]
}
```

Reservations expire after **30 minutes**. The order-service must confirm or release before expiry.

#### Get reservations for order
```
GET /api/inventory/reservations/:orderId
```

#### Cancel reservations for order
```
DELETE /api/inventory/reservations/:orderId
```

---

### Warehouses

#### List warehouses
```
GET /api/inventory/warehouses
```

```jsonc
{
  "warehouses": [
    {
      "id": "wh_01J...",
      "code": "DSM-MAIN",
      "name": "Dar es Salaam Main",
      "type": "MAIN",
      "status": "ACTIVE",
      "address": { "city": "Dar es Salaam", "region": "Kinondoni" },
      "operatingHours": { "open": "08:00", "close": "18:00" }
    }
  ],
  "total": 1
}
```

Warehouse types: `MAIN` | `REGIONAL` | `SUPPLIER`

#### Get warehouse
```
GET /api/inventory/warehouses/:id
```

---

### Inventory counts (warehouse ops)

#### Start count
```
POST /api/inventory/inventory-counts
```
```jsonc
{ "warehouseId": "wh_01J...", "type": "full", "notes": "Monthly full count" }
```

#### Complete count
```
PUT /api/inventory/inventory-counts/:countId
```
```jsonc
{
  "items": [
    { "variantId": "var_01J...", "systemQuantity": 45, "countedQuantity": 43, "discrepancy": -2, "unitCost": 5000 }
  ],
  "approvedBy": "usr_admin_01J..."
}
```

---

### Stock analytics
```
GET /api/inventory/analytics/stock-levels?warehouseId=wh_01J...&lowStockOnly=true
```

---

## Stock status display

| Status | Badge color | Add to cart |
|---|---|---|
| `in_stock` | green | enabled |
| `low_stock` | yellow | enabled — show count |
| `out_of_stock` | red | disabled |

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `Stock not found` | 404 | No stock record for variant |
| `Stock reservation failed` | 409 | Insufficient stock — `unavailableItems[]` in body |
| `Insufficient available stock` | 422 | `reserve()` called with more than available |
| `Invalid query parameters` | 400 | Bad query params |
| `Internal server error` | 500 | Server failure — retry with backoff |
