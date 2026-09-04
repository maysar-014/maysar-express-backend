-- Migration: Add multi-seller order support (Approach A)
-- Adds Order_MasterOrder and Order_MasterOrderItem tables.
-- All existing Order_Order records remain valid — served as Virtual Master Orders at read time.
-- No data migration required.

-- Master order grouping table
CREATE TABLE IF NOT EXISTS "order_master_orders" (
  "id"            VARCHAR(64)  NOT NULL,
  "buyerId"       VARCHAR(64)  NOT NULL,
  "totalAmount"   DECIMAL(14,2) NOT NULL,
  "currency"      VARCHAR(8)   NOT NULL DEFAULT 'TZS',
  "paymentMethod" VARCHAR(32)  NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_master_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "order_master_orders_buyerId_idx"  ON "order_master_orders"("buyerId");
CREATE INDEX IF NOT EXISTS "order_master_orders_createdAt_idx" ON "order_master_orders"("createdAt");

-- Join table: master order ↔ seller orders
CREATE TABLE IF NOT EXISTS "order_master_order_items" (
  "masterOrderId" VARCHAR(64) NOT NULL,
  "sellerOrderId" VARCHAR(64) NOT NULL,

  CONSTRAINT "order_master_order_items_pkey" PRIMARY KEY ("masterOrderId", "sellerOrderId"),
  CONSTRAINT "order_master_order_items_sellerOrderId_unique" UNIQUE ("sellerOrderId"),
  CONSTRAINT "order_master_order_items_masterOrderId_fkey"
    FOREIGN KEY ("masterOrderId") REFERENCES "order_master_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_master_order_items_sellerOrderId_fkey"
    FOREIGN KEY ("sellerOrderId") REFERENCES "orders"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_master_order_items_sellerOrderId_idx" ON "order_master_order_items"("sellerOrderId");

-- Add masterOrderId to payments (nullable — single-seller legacy payments have no master order)
ALTER TABLE "order_payments"
  ADD COLUMN IF NOT EXISTS "masterOrderId" VARCHAR(64);

-- Add sellerQuotes to checkout sessions (stores { [sellerId]: { quoteId } } for multi-seller checkout)
ALTER TABLE "Checkout_CheckoutSession"
  ADD COLUMN IF NOT EXISTS "sellerQuotes" JSONB;
