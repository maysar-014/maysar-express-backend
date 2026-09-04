-- ============================================================
-- Migration: Product Intelligence Engine
-- ============================================================
-- This migration is the canonical, merged version that includes
-- the schema sync changes originally generated as 20260831234337.
-- It creates all new tables with VARCHAR column types (not enums)
-- to match the final schema.prisma Prisma model definitions.
-- ============================================================

-- ── catalog_category_attributes: add semantic metadata columns ────────────
ALTER TABLE "catalog_category_attributes"
  ADD COLUMN IF NOT EXISTS "searchable"          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "comparable"           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "filterable"           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "descriptionPriority"  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "seoPriority"          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "highlightPriority"    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "displayGroup"         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "identityRelevant"     BOOLEAN      NOT NULL DEFAULT false;

-- ── catalog_seller_offers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_seller_offers" (
  "id"                      VARCHAR(64)   NOT NULL PRIMARY KEY,
  "productId"               VARCHAR(64)   NOT NULL,
  "sellerId"                VARCHAR(64)   NOT NULL,
  "price"                   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency"                VARCHAR(10)   NOT NULL DEFAULT 'TZS',
  "minimumOrderQuantity"    INTEGER       NOT NULL DEFAULT 1,
  "codAccepted"             BOOLEAN       NOT NULL DEFAULT FALSE,
  "freeDelivery"            BOOLEAN       NOT NULL DEFAULT FALSE,
  "deliveryTerms"           TEXT,
  "condition"               VARCHAR(20)   NOT NULL DEFAULT 'new',
  "enablerEnabled"          BOOLEAN       NOT NULL DEFAULT FALSE,
  "enablerCommissionRate"   DECIMAL(5,4),
  "supplierLocationId"      VARCHAR(64),
  "supplierLocationDisplay" TEXT,
  "isActive"                BOOLEAN       NOT NULL DEFAULT TRUE,
  "createdAt"               TIMESTAMP(6)  NOT NULL DEFAULT now(),
  "updatedAt"               TIMESTAMP(6)  NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_seller_offers_productId_sellerId_key"
  ON "catalog_seller_offers" ("productId", "sellerId");
CREATE INDEX IF NOT EXISTS "catalog_seller_offers_productId_idx"
  ON "catalog_seller_offers" ("productId");
CREATE INDEX IF NOT EXISTS "catalog_seller_offers_sellerId_idx"
  ON "catalog_seller_offers" ("sellerId");
CREATE INDEX IF NOT EXISTS "catalog_seller_offers_productId_isActive_idx"
  ON "catalog_seller_offers" ("productId", "isActive");

-- ── catalog_product_content_sections ─────────────────────────────────────
-- Uses VARCHAR instead of enums so Prisma does not need custom type handling.
CREATE TABLE IF NOT EXISTS "catalog_product_content_sections" (
  "id"                     VARCHAR(64)  NOT NULL PRIMARY KEY,
  "productId"              VARCHAR(64)  NOT NULL,
  "sectionType"            VARCHAR(40)  NOT NULL,
  "content"                TEXT         NOT NULL,
  "source"                 VARCHAR(30)  NOT NULL DEFAULT 'SELLER_ATTRIBUTE',
  "contributingAttributes" TEXT[]       NOT NULL,
  "isSellerOffer"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "schemaVersion"          VARCHAR(64),
  "contentVersion"         INTEGER      NOT NULL DEFAULT 1,
  "generatedAt"            TIMESTAMP(6) NOT NULL DEFAULT now(),
  "createdAt"              TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMP(6) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_product_content_sections_productId_sectionType_key"
  ON "catalog_product_content_sections" ("productId", "sectionType");
CREATE INDEX IF NOT EXISTS "catalog_product_content_sections_productId_idx"
  ON "catalog_product_content_sections" ("productId");
CREATE INDEX IF NOT EXISTS "catalog_product_content_sections_productId_isSellerOffer_idx"
  ON "catalog_product_content_sections" ("productId", "isSellerOffer");

-- ── catalog_product_lifecycle_log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "catalog_product_lifecycle_log" (
  "id"           VARCHAR(64)  NOT NULL PRIMARY KEY,
  "productId"    VARCHAR(64)  NOT NULL,
  "fromState"    VARCHAR(32),
  "toState"      VARCHAR(32)  NOT NULL,
  "blockReasons" TEXT[]       NOT NULL,
  "reason"       TEXT,
  "triggeredBy"  VARCHAR(64),
  "createdAt"    TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "catalog_product_lifecycle_log_productId_idx"
  ON "catalog_product_lifecycle_log" ("productId");
CREATE INDEX IF NOT EXISTS "catalog_product_lifecycle_log_productId_toState_idx"
  ON "catalog_product_lifecycle_log" ("productId", "toState");
CREATE INDEX IF NOT EXISTS "catalog_product_lifecycle_log_createdAt_idx"
  ON "catalog_product_lifecycle_log" ("createdAt");

-- ── catalog_products: add lifecycleState column ───────────────────────────
ALTER TABLE "catalog_products"
  ADD COLUMN IF NOT EXISTS "lifecycleState" VARCHAR(32) NOT NULL DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "catalog_products_lifecycleState_idx"
  ON "catalog_products" ("lifecycleState");
