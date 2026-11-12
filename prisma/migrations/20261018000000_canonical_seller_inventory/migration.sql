-- Seller inventory becomes canonical in inventory-service. Catalog retains the
-- location metadata, while its legacy product-location balances are imported as
-- opening inventory only when product -> variant mapping is unambiguous.

ALTER TABLE "inventory_warehouses"
  ADD COLUMN IF NOT EXISTS "sellerId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "sellerLocationId" VARCHAR(64);

ALTER TABLE "inventory_stock_items"
  ADD COLUMN IF NOT EXISTS "quantityUnavailable" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantityInTransit" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_warehouses_sellerLocationId_key"
  ON "inventory_warehouses" ("sellerLocationId")
  WHERE "sellerLocationId" IS NOT NULL;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "isInventoryPreDeducted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stockReconciledAt" TIMESTAMP(6);

-- These columns are present in the current catalog model but were introduced
-- without a migration in older installations. Make the import self-contained.
ALTER TABLE "catalog_product_locations"
  ADD COLUMN IF NOT EXISTS "quantityUnavailable" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantityInTransit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "reorderPoint" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxStock" INTEGER;

CREATE TABLE IF NOT EXISTS "inventory_pending_stock_outs" (
  "id" VARCHAR(64) NOT NULL PRIMARY KEY,
  "sellerId" VARCHAR(64) NOT NULL,
  "warehouseId" VARCHAR(64) NOT NULL,
  "productVariantId" VARCHAR(64) NOT NULL,
  "movementId" VARCHAR(64) NOT NULL UNIQUE,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "remainingQuantity" INTEGER NOT NULL CHECK ("remainingQuantity" >= 0),
  "reason" VARCHAR(255) NOT NULL,
  "occurredAt" TIMESTAMP(6) NOT NULL,
  "performedBy" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_pending_stock_outs_remaining_check"
    CHECK ("remainingQuantity" <= "quantity")
);

CREATE INDEX IF NOT EXISTS "inventory_pending_stock_outs_seller_status_occurred_idx"
  ON "inventory_pending_stock_outs" ("sellerId", "status", "occurredAt");
CREATE INDEX IF NOT EXISTS "inventory_pending_stock_outs_warehouse_variant_idx"
  ON "inventory_pending_stock_outs" ("warehouseId", "productVariantId");

CREATE TABLE IF NOT EXISTS "inventory_stock_out_allocations" (
  "id" VARCHAR(64) NOT NULL PRIMARY KEY,
  "pendingStockOutId" VARCHAR(64) NOT NULL REFERENCES "inventory_pending_stock_outs"("id") ON DELETE RESTRICT,
  "orderId" VARCHAR(64) NOT NULL,
  "orderItemId" VARCHAR(64) NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_stock_out_allocations_pending_line_key" UNIQUE ("pendingStockOutId", "orderItemId")
);
CREATE INDEX IF NOT EXISTS "inventory_stock_out_allocations_order_idx"
  ON "inventory_stock_out_allocations" ("orderId");

CREATE TABLE IF NOT EXISTS "inventory_reconciliation_requests" (
  "id" VARCHAR(64) NOT NULL PRIMARY KEY,
  "sellerId" VARCHAR(64) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "operation" VARCHAR(32) NOT NULL,
  "resourceId" VARCHAR(64),
  "orderId" VARCHAR(64),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_reconciliation_requests_seller_key" UNIQUE ("sellerId", "idempotencyKey")
);

DROP TABLE IF EXISTS "catalog_stock_transfers";
DROP TABLE IF EXISTS "catalog_product_locations";
DROP TABLE IF EXISTS "catalog_stock_valuation_snapshots";
DROP TYPE IF EXISTS "Catalog_StockTransferStatus";
