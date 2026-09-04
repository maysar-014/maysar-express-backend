-- ============================================================
-- Migration: Seller Locations & Product Inventory
-- ============================================================
-- Introduces:
--   catalog_seller_locations      — seller-owned shops / warehouses
--   catalog_product_locations     — product stock per seller location
--   catalog_stock_transfers       — stock movement between locations
--   catalog_fulfillment_selections — audit of checkout location picks
-- Also adds fulfillmentLocationId to orders table
-- ============================================================

-- Enum: location type
DO $$ BEGIN
  CREATE TYPE "Catalog_LocationType" AS ENUM ('SHOP', 'WAREHOUSE', 'PICKUP_POINT', 'HOME_BASED', 'DISTRIBUTION_CENTER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "Catalog_LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "Catalog_StockTransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── catalog_seller_locations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_seller_locations" (
  "id"             VARCHAR(64)               NOT NULL PRIMARY KEY,
  "sellerId"       VARCHAR(64)               NOT NULL,
  "name"           VARCHAR(255)              NOT NULL,
  "type"           "Catalog_LocationType"    NOT NULL DEFAULT 'SHOP',
  "status"         "Catalog_LocationStatus"  NOT NULL DEFAULT 'ACTIVE',
  "street"         TEXT                      NOT NULL,
  "ward"           TEXT,
  "district"       TEXT,
  "region"         TEXT                      NOT NULL,
  "postalCode"     TEXT,
  "country"        TEXT                      NOT NULL DEFAULT 'Tanzania',
  "latitude"       DECIMAL(10,7)             NOT NULL,
  "longitude"      DECIMAL(10,7)             NOT NULL,
  "isPrimary"      BOOLEAN                   NOT NULL DEFAULT FALSE,
  "isActive"       BOOLEAN                   NOT NULL DEFAULT TRUE,
  "operatingHours" JSONB,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(6)              NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP(6)              NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_seller_locations_seller"
  ON "catalog_seller_locations" ("sellerId");
CREATE INDEX IF NOT EXISTS "idx_seller_locations_coords"
  ON "catalog_seller_locations" ("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "idx_seller_locations_status"
  ON "catalog_seller_locations" ("sellerId", "status");

-- ── catalog_product_locations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_product_locations" (
  "id"                VARCHAR(64)  NOT NULL PRIMARY KEY,
  "productId"         VARCHAR(64)  NOT NULL,
  "locationId"        VARCHAR(64)  NOT NULL REFERENCES "catalog_seller_locations"("id") ON DELETE CASCADE,
  "sellerId"          VARCHAR(64)  NOT NULL,
  "quantityAvailable" INTEGER      NOT NULL DEFAULT 0,
  "quantityReserved"  INTEGER      NOT NULL DEFAULT 0,
  "isAvailable"       BOOLEAN      NOT NULL DEFAULT TRUE,
  "createdAt"         TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_location"
  ON "catalog_product_locations" ("productId", "locationId");
CREATE INDEX IF NOT EXISTS "idx_product_locations_product"
  ON "catalog_product_locations" ("productId");
CREATE INDEX IF NOT EXISTS "idx_product_locations_location"
  ON "catalog_product_locations" ("locationId");
CREATE INDEX IF NOT EXISTS "idx_product_locations_seller"
  ON "catalog_product_locations" ("sellerId");

-- ── catalog_stock_transfers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_stock_transfers" (
  "id"             VARCHAR(64)                  NOT NULL PRIMARY KEY,
  "sellerId"       VARCHAR(64)                  NOT NULL,
  "productId"      VARCHAR(64)                  NOT NULL,
  "fromLocationId" VARCHAR(64)                  NOT NULL REFERENCES "catalog_seller_locations"("id"),
  "toLocationId"   VARCHAR(64)                  NOT NULL REFERENCES "catalog_seller_locations"("id"),
  "quantity"       INTEGER                      NOT NULL,
  "status"         "Catalog_StockTransferStatus" NOT NULL DEFAULT 'PENDING',
  "notes"          TEXT,
  "initiatedBy"    VARCHAR(64),
  "completedAt"    TIMESTAMP(6),
  "createdAt"      TIMESTAMP(6)                 NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP(6)                 NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_stock_transfers_seller"
  ON "catalog_stock_transfers" ("sellerId");
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_product"
  ON "catalog_stock_transfers" ("productId");

-- ── catalog_fulfillment_selections ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_fulfillment_selections" (
  "id"             VARCHAR(64)  NOT NULL PRIMARY KEY,
  "checkoutId"     VARCHAR(64)  NOT NULL,
  "productId"      VARCHAR(64)  NOT NULL,
  "sellerId"       VARCHAR(64)  NOT NULL,
  "locationId"     VARCHAR(64)  NOT NULL,
  "selectionBasis" TEXT         NOT NULL DEFAULT 'proximity',
  "buyerLat"       DECIMAL(10,7),
  "buyerLng"       DECIMAL(10,7),
  "distanceKm"     DECIMAL(8,3),
  "stockAvailable" INTEGER,
  "createdAt"      TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_fulfillment_selections_checkout"
  ON "catalog_fulfillment_selections" ("checkoutId");

-- ── orders: add fulfillmentLocationId ────────────────────────────────────
-- Order_Order maps to table "orders" via @@map("orders") in schema.prisma
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "fulfillmentLocationId" VARCHAR(64);
