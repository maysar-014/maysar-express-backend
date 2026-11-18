-- Migration: delivery_economics_gaps
-- MYS-DEL-001 Pre-launch gap remediation
--
-- Gap 2: Add constitutional outcomeCode to Logistics_Delivery
-- Gap 3: Add payment processing rates to Logistics_PricingConfig
--        (Logistics_AuthorizedSubsidy and Logistics_MerchantDeliveryPolicy
--         are created by a separate migration since they are new tables;
--         schema additions for existing tables are handled here)
--
-- All changes are additive (nullable or with defaults) — no data loss possible.
-- Rollback: ALTER TABLE ... DROP COLUMN for each added column.

-- ── Gap 2: Logistics_Delivery — constitutional outcome columns ────────────────

ALTER TABLE IF EXISTS "logistics_deliveries"
  ADD COLUMN IF NOT EXISTS "outcomeCode"              VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "outcomeResponsibleParty"  VARCHAR(16);

CREATE INDEX IF NOT EXISTS "logistics_deliveries_outcomeCode_idx"
  ON "logistics_deliveries" ("outcomeCode");

-- ── Gap 3: Logistics_PricingConfig — payment processing rates ─────────────────
-- All nullable — existing rows remain valid; application code applies defaults.

ALTER TABLE IF EXISTS "logistics_pricing_configs"
  ADD COLUMN IF NOT EXISTS "mobileMoneyProcessingRatePct" DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "cardProcessingRatePct"        DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "codProcessingRatePct"         DECIMAL(6,4);

-- Set sensible defaults on the existing active config row so reports immediately
-- show real payment costs rather than zero.
-- Mobile money (Tanzanian providers): ~1%
-- Card:                                ~1.5%
-- COD cash handling:                   ~0.5%
UPDATE "logistics_pricing_configs"
SET
  "mobileMoneyProcessingRatePct" = 0.0100,
  "cardProcessingRatePct"        = 0.0150,
  "codProcessingRatePct"         = 0.0050
WHERE "mobileMoneyProcessingRatePct" IS NULL;

-- ── New tables (Logistics_AuthorizedSubsidy, Logistics_MerchantDeliveryPolicy) ─
-- These were added to the schema in an earlier session.
-- Create them here if they don't yet exist in the target database.

CREATE TABLE IF NOT EXISTS "logistics_merchant_delivery_policies" (
  "id"              VARCHAR(64) NOT NULL PRIMARY KEY,
  "merchantId"      VARCHAR(64) NOT NULL UNIQUE,
  "contributionType" VARCHAR(32) NOT NULL,
  "rate"            DECIMAL(8,6),
  "amountTzs"       DECIMAL(12,2),
  "agreementRef"    VARCHAR(128),
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "logistics_merchant_delivery_policies_isActive_idx"
  ON "logistics_merchant_delivery_policies" ("isActive");

CREATE TABLE IF NOT EXISTS "logistics_authorized_subsidies" (
  "id"                 VARCHAR(64) NOT NULL PRIMARY KEY,
  "fundingSource"      VARCHAR(32) NOT NULL,
  "purpose"            VARCHAR(40) NOT NULL,
  "authorizedAmountTzs" DECIMAL(12,2) NOT NULL,
  "authorizedBy"       VARCHAR(64) NOT NULL,
  "authorizedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"          TIMESTAMPTZ,
  "sourceRef"          VARCHAR(128),
  "applicableZone"     VARCHAR(32),
  "applicableStrategy" VARCHAR(32),
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "logistics_authorized_subsidies_isActive_expiresAt_idx"
  ON "logistics_authorized_subsidies" ("isActive", "expiresAt");

CREATE INDEX IF NOT EXISTS "logistics_authorized_subsidies_fundingSource_idx"
  ON "logistics_authorized_subsidies" ("fundingSource");
