-- Migration: Add Phase 6 fairness + buyer-profile tables
-- logistics_optimization_configs: three fairness threshold columns (§6.1)
-- Logistics_FairnessFlag (visible escalation of failed checks, §6.1)
-- Logistics_BuyerProfile (buyer behavior model, §6.3)

ALTER TABLE "logistics_optimization_configs"
  ADD COLUMN IF NOT EXISTS "maxBuyerPriceRatio"          DECIMAL(6,4)  NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS "minimumDriverHourlyRateTzs"  DECIMAL(12,2) NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS "minVehicleUtilizationTarget" DECIMAL(6,4)  NOT NULL DEFAULT 0.5;

CREATE TABLE IF NOT EXISTS "logistics_fairness_flags" (
  "id"            VARCHAR(64)  NOT NULL,
  "optionId"      VARCHAR(64),
  "deliveryJobId" VARCHAR(64),
  "checkType"     VARCHAR(32)  NOT NULL,
  "computedValue" DECIMAL(12,4) NOT NULL,
  "threshold"     DECIMAL(12,4) NOT NULL,
  "detail"        VARCHAR(255),
  "flaggedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"    TIMESTAMP(3),
  "resolvedBy"    VARCHAR(64),

  CONSTRAINT "logistics_fairness_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lff_checkType_idx" ON "logistics_fairness_flags"("checkType");
CREATE INDEX IF NOT EXISTS "lff_resolvedAt_idx" ON "logistics_fairness_flags"("resolvedAt");

CREATE TABLE IF NOT EXISTS "logistics_buyer_profiles" (
  "id"                          VARCHAR(64)  NOT NULL,
  "buyerId"                     VARCHAR(64)  NOT NULL,
  "preferredDeliveryWindows"    JSONB        NOT NULL DEFAULT '{}',
  "deliverySuccessRate"         DECIMAL(4,3) NOT NULL DEFAULT 0.8,
  "completedDeliveries"         INTEGER      NOT NULL DEFAULT 0,
  "failedDeliveries"            INTEGER      NOT NULL DEFAULT 0,
  "typicalOrderWeightKg"        DECIMAL(8,3) NOT NULL DEFAULT 0,
  "consolidationAcceptanceRate" DECIMAL(4,3) NOT NULL DEFAULT 0,
  "pickupPreference"            VARCHAR(16)  NOT NULL DEFAULT 'DELIVERY',
  "lastUpdatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_buyer_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lbp_buyerId_key" ON "logistics_buyer_profiles"("buyerId");
