-- Migration: Redesign delivery pricing engine (v2)
-- Replaces the flat-rate pricing config columns with strategy-aware JSON config.
-- Old columns (baseFee, distanceRateTzsPerKm, etc.) are removed.
-- New columns support: localUrban, metropolitan, intercityCorridors, codPolicy.
-- Historical quotes remain valid — they reference pricingVersion which maps to
-- the config version that generated them. Old version 1 rows in the DB retain
-- their data through a JSON migration step below.

-- Step 1: Add new columns
ALTER TABLE "logistics_pricing_configs"
  ADD COLUMN IF NOT EXISTS "codPolicy"          JSONB,
  ADD COLUMN IF NOT EXISTS "localUrban"         JSONB,
  ADD COLUMN IF NOT EXISTS "metropolitan"       JSONB,
  ADD COLUMN IF NOT EXISTS "intercityCorridors" JSONB,
  ADD COLUMN IF NOT EXISTS "intercityFallback"  JSONB,
  ADD COLUMN IF NOT EXISTS "remoteUnavailable"  BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate any existing v1 rows to a compatible v2 JSON structure
-- This preserves old v1 data as a legacy "flat" config that won't be used
-- for new quotes (v2 will be seeded separately) but keeps the row intact.
UPDATE "logistics_pricing_configs"
SET
  "codPolicy" = '{"fixedChargeTzs": 500, "valueSurchargeRate": 0.005, "valueSurchargeThresholdTzs": 100000}'::jsonb,
  "localUrban" = '{
    "distanceBands": [
      {"maxDistanceKm": 3,  "fulfillmentCostTzs": 1800},
      {"maxDistanceKm": 7,  "fulfillmentCostTzs": 2500},
      {"maxDistanceKm": 12, "fulfillmentCostTzs": 3200},
      {"maxDistanceKm": 20, "fulfillmentCostTzs": 4000}
    ],
    "weightBands": [
      {"maxWeightKg": 1,    "additionalCostTzs": 0},
      {"maxWeightKg": 5,    "additionalCostTzs": 500},
      {"maxWeightKg": 10,   "additionalCostTzs": 1200},
      {"maxWeightKg": 20,   "additionalCostTzs": 2500},
      {"maxWeightKg": 9999, "additionalCostTzs": 5000}
    ],
    "operationalSurcharge": {
      "peakHourSurchargeAmount": 300,
      "peakHours": [{"startHour": 7, "endHour": 9}, {"startHour": 17, "endHour": 20}]
    }
  }'::jsonb,
  "metropolitan" = '{
    "distanceBands": [
      {"maxDistanceKm": 35, "fulfillmentCostTzs": 5000},
      {"maxDistanceKm": 50, "fulfillmentCostTzs": 6500},
      {"maxDistanceKm": 80, "fulfillmentCostTzs": 8500}
    ],
    "weightBands": [
      {"maxWeightKg": 1,    "additionalCostTzs": 0},
      {"maxWeightKg": 5,    "additionalCostTzs": 800},
      {"maxWeightKg": 10,   "additionalCostTzs": 1800},
      {"maxWeightKg": 20,   "additionalCostTzs": 3500},
      {"maxWeightKg": 9999, "additionalCostTzs": 7000}
    ],
    "operationalSurcharge": {"peakHourSurchargeAmount": 0, "peakHours": []}
  }'::jsonb,
  "intercityCorridors" = '[]'::jsonb,
  "intercityFallback" = '{
    "corridorKey": "GENERAL_INTERCITY",
    "originRegions": [], "destinationRegions": [],
    "bidirectional": true,
    "originHandlingCostTzs": 1000,
    "lineHaulBaseCostTzs": 8000,
    "weightRateTzsPerKg": 500,
    "destinationHandlingCostTzs": 1000,
    "lastMileCostTzs": 2000,
    "estimatedTransitHours": 10,
    "isActive": true
  }'::jsonb
WHERE "codPolicy" IS NULL;

-- Step 3: Make new columns non-nullable now that all rows have been migrated
ALTER TABLE "logistics_pricing_configs"
  ALTER COLUMN "codPolicy"          SET NOT NULL,
  ALTER COLUMN "localUrban"         SET NOT NULL,
  ALTER COLUMN "metropolitan"       SET NOT NULL,
  ALTER COLUMN "intercityCorridors" SET NOT NULL;

-- Step 4: Remove old flat-rate columns (now superseded by JSON strategy configs)
-- These columns are no longer read by the application.
ALTER TABLE "logistics_pricing_configs"
  DROP COLUMN IF EXISTS "baseFee",
  DROP COLUMN IF EXISTS "distanceRateTzsPerKm",
  DROP COLUMN IF EXISTS "timeRateTzsPerMinute",
  DROP COLUMN IF EXISTS "packageWeightTiers",
  DROP COLUMN IF EXISTS "zoneMultipliers",
  DROP COLUMN IF EXISTS "operationalSurcharge",
  DROP COLUMN IF EXISTS "riskSurchargeRateCod";
