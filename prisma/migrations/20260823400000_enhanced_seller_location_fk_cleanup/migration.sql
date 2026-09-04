-- ============================================================
-- Migration: Enhanced Seller Location FK Cleanup
--
-- Runs AFTER 20260823300000_seller_locations_and_product_inventory
-- which creates catalog_product_locations, catalog_stock_transfers,
-- catalog_seller_locations, and catalog_fulfillment_selections.
--
-- On databases where 20260823111121_add_enhanced_seller_location
-- was already applied (i.e. the original version before it was
-- made a no-op), all statements are idempotent via IF EXISTS /
-- constraint existence checks.
-- ============================================================

-- ── Drop legacy FKs (may not exist on fresh databases) ───────────────────

ALTER TABLE "catalog_product_locations"
  DROP CONSTRAINT IF EXISTS "catalog_product_locations_locationId_fkey";

ALTER TABLE "catalog_stock_transfers"
  DROP CONSTRAINT IF EXISTS "catalog_stock_transfers_fromLocationId_fkey";

ALTER TABLE "catalog_stock_transfers"
  DROP CONSTRAINT IF EXISTS "catalog_stock_transfers_toLocationId_fkey";

ALTER TABLE "order_master_order_items"
  DROP CONSTRAINT IF EXISTS "order_master_order_items_masterOrderId_fkey";

ALTER TABLE "order_master_order_items"
  DROP CONSTRAINT IF EXISTS "order_master_order_items_sellerOrderId_fkey";

-- ── Drop DEFAULT on updatedAt columns ────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_product_locations'
      AND column_name = 'updatedAt'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "catalog_product_locations" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_seller_locations'
      AND column_name = 'updatedAt'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "catalog_seller_locations" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_stock_transfers'
      AND column_name = 'updatedAt'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "catalog_stock_transfers" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_consolidation_audits'
      AND column_name = 'deliveryGroupIds'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "logistics_consolidation_audits"
      ALTER COLUMN "deliveryGroupIds" DROP DEFAULT,
      ALTER COLUMN "groupSizes" DROP DEFAULT,
      ALTER COLUMN "rulesApplied" DROP DEFAULT,
      ALTER COLUMN "totalSavingsTzs" DROP DEFAULT,
      ALTER COLUMN "pricingVersion" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logistics_delivery_groups'
      AND column_name = 'sellerOrderIds'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "logistics_delivery_groups"
      ALTER COLUMN "sellerOrderIds" DROP DEFAULT,
      ALTER COLUMN "pickupSequence" DROP DEFAULT,
      ALTER COLUMN "buyerDestination" DROP DEFAULT,
      ALTER COLUMN "totalDeliveryCost" DROP DEFAULT,
      ALTER COLUMN "pricingVersion" DROP DEFAULT,
      ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_master_orders'
      AND column_name = 'updatedAt'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "order_master_orders" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- ── Re-add FKs ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_master_order_items_masterOrderId_fkey'
  ) THEN
    ALTER TABLE "order_master_order_items"
      ADD CONSTRAINT "order_master_order_items_masterOrderId_fkey"
      FOREIGN KEY ("masterOrderId") REFERENCES "order_master_orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_master_order_items_sellerOrderId_fkey'
  ) THEN
    ALTER TABLE "order_master_order_items"
      ADD CONSTRAINT "order_master_order_items_sellerOrderId_fkey"
      FOREIGN KEY ("sellerOrderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'catalog_product_locations_locationId_fkey'
  ) THEN
    ALTER TABLE "catalog_product_locations"
      ADD CONSTRAINT "catalog_product_locations_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "catalog_seller_locations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'catalog_stock_transfers_fromLocationId_fkey'
  ) THEN
    ALTER TABLE "catalog_stock_transfers"
      ADD CONSTRAINT "catalog_stock_transfers_fromLocationId_fkey"
      FOREIGN KEY ("fromLocationId") REFERENCES "catalog_seller_locations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'catalog_stock_transfers_toLocationId_fkey'
  ) THEN
    ALTER TABLE "catalog_stock_transfers"
      ADD CONSTRAINT "catalog_stock_transfers_toLocationId_fkey"
      FOREIGN KEY ("toLocationId") REFERENCES "catalog_seller_locations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'catalog_fulfillment_selections_locationId_fkey'
  ) THEN
    ALTER TABLE "catalog_fulfillment_selections"
      ADD CONSTRAINT "catalog_fulfillment_selections_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "catalog_seller_locations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Rename indexes (idempotent) ───────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fulfillment_selections_checkout') THEN
    ALTER INDEX "idx_fulfillment_selections_checkout" RENAME TO "catalog_fulfillment_selections_checkoutId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_locations_location') THEN
    ALTER INDEX "idx_product_locations_location" RENAME TO "catalog_product_locations_locationId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_locations_product') THEN
    ALTER INDEX "idx_product_locations_product" RENAME TO "catalog_product_locations_productId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_locations_seller') THEN
    ALTER INDEX "idx_product_locations_seller" RENAME TO "catalog_product_locations_sellerId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_product_location') THEN
    ALTER INDEX "uq_product_location" RENAME TO "catalog_product_locations_productId_locationId_key";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_seller_locations_coords') THEN
    ALTER INDEX "idx_seller_locations_coords" RENAME TO "catalog_seller_locations_latitude_longitude_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_seller_locations_seller') THEN
    ALTER INDEX "idx_seller_locations_seller" RENAME TO "catalog_seller_locations_sellerId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_seller_locations_status') THEN
    ALTER INDEX "idx_seller_locations_status" RENAME TO "catalog_seller_locations_sellerId_status_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_transfers_product') THEN
    ALTER INDEX "idx_stock_transfers_product" RENAME TO "catalog_stock_transfers_productId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stock_transfers_seller') THEN
    ALTER INDEX "idx_stock_transfers_seller" RENAME TO "catalog_stock_transfers_sellerId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'lca_masterOrderId_idx') THEN
    ALTER INDEX "lca_masterOrderId_idx" RENAME TO "logistics_consolidation_audits_masterOrderId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ldg_masterOrderId_idx') THEN
    ALTER INDEX "ldg_masterOrderId_idx" RENAME TO "logistics_delivery_groups_masterOrderId_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ldg_status_idx') THEN
    ALTER INDEX "ldg_status_idx" RENAME TO "logistics_delivery_groups_status_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'order_master_order_items_sellerOrderId_unique') THEN
    ALTER INDEX "order_master_order_items_sellerOrderId_unique" RENAME TO "order_master_order_items_sellerOrderId_key";
  END IF;
END $$;
