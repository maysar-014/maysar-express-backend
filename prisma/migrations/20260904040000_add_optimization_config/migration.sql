-- Migration: Add Logistics_OptimizationConfig (Phase 4 §4.2)
-- Versioned operator-configurable ranking weights (sum to 1.0, validated at
-- save; changes require a new version — no in-place overwrites) plus the
-- Phase 3 §3.4 CostVariancePolicy fields.

CREATE TABLE IF NOT EXISTS "logistics_optimization_configs" (
  "id"                            VARCHAR(64)    NOT NULL,
  "version"                       INTEGER        NOT NULL,
  "buyerCostWeight"               DECIMAL(6,4)   NOT NULL,
  "deliveryTimeWeight"            DECIMAL(6,4)   NOT NULL,
  "vehicleUtilizationWeight"      DECIMAL(6,4)   NOT NULL,
  "failureRiskWeight"             DECIMAL(6,4)   NOT NULL,
  "driverEfficiencyWeight"        DECIMAL(6,4)   NOT NULL,
  "maysarMarginWeight"            DECIMAL(6,4)   NOT NULL,
  "maysarAbsorbsUpToTzs"          DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "customerChargeableVarianceTypes" JSONB        NOT NULL DEFAULT '[]',
  "isActive"                      BOOLEAN        NOT NULL DEFAULT true,
  "createdAt"                     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_optimization_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "logistics_optimization_configs_version_key" UNIQUE ("version")
);
CREATE INDEX IF NOT EXISTS "loc_isActive_idx" ON "logistics_optimization_configs"("isActive");
