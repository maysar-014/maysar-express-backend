-- Migration: Add Delivery Consolidation Engine
-- Adds Logistics_DeliveryGroup and Logistics_ConsolidationAudit tables.
-- Extends Logistics_Quote with deliveryGroupId and sellerOrderIds.
-- Extends Logistics_PricingConfig with four consolidation parameters.
-- Extends checkout_sessions with deliveryGroups JSON column.

CREATE TABLE IF NOT EXISTS "logistics_delivery_groups" (
  "id"                  VARCHAR(64)    NOT NULL,
  "masterOrderId"       VARCHAR(64)    NOT NULL,
  "sellerOrderIds"      JSONB          NOT NULL DEFAULT '[]',
  "pickupSequence"      JSONB          NOT NULL DEFAULT '[]',
  "buyerDestination"    JSONB          NOT NULL DEFAULT '{}',
  "totalDeliveryCost"   DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "pricingVersion"      INTEGER        NOT NULL DEFAULT 0,
  "allocationAlgorithm" VARCHAR(32)    NOT NULL DEFAULT 'weight_proportional',
  "status"              VARCHAR(32)    NOT NULL DEFAULT 'PENDING_PRICING',
  "quoteId"             VARCHAR(64),
  "createdAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_delivery_groups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ldg_masterOrderId_idx" ON "logistics_delivery_groups"("masterOrderId");
CREATE INDEX IF NOT EXISTS "ldg_status_idx"        ON "logistics_delivery_groups"("status");

CREATE TABLE IF NOT EXISTS "logistics_consolidation_audits" (
  "id"               VARCHAR(64)    NOT NULL,
  "masterOrderId"    VARCHAR(64)    NOT NULL,
  "deliveryGroupIds" JSONB          NOT NULL DEFAULT '[]',
  "groupSizes"       JSONB          NOT NULL DEFAULT '[]',
  "rulesApplied"     JSONB          NOT NULL DEFAULT '{}',
  "totalSavingsTzs"  DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "fallbackReason"   TEXT,
  "pricingVersion"   INTEGER        NOT NULL DEFAULT 0,
  "consolidatedAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_consolidation_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lca_masterOrderId_idx" ON "logistics_consolidation_audits"("masterOrderId");

-- Extend Logistics_Quote with group-level fields
ALTER TABLE "logistics_quotes"
  ADD COLUMN IF NOT EXISTS "deliveryGroupId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "sellerOrderIds"  JSONB;

-- Extend Logistics_PricingConfig with consolidation parameters
ALTER TABLE "logistics_pricing_configs"
  ADD COLUMN IF NOT EXISTS "consolidationRadiusKm"           DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "maxConsolidatedRouteOverheadPct"  DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "maxGroupWeightKg"                 DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "allocationAlgorithm"              VARCHAR(32);

-- Extend checkout_sessions with delivery group mapping
ALTER TABLE "Checkout_CheckoutSession"
  ADD COLUMN IF NOT EXISTS "deliveryGroups" JSONB;
