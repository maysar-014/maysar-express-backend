-- Migration: Add Vehicle capability models (Phase 2 §2.3)
-- Logistics_Vehicle + versioned Logistics_VehicleTariff.
-- Tariffs are NEVER overwritten: historical orders reference the version
-- at time of pricing. See LOGISTICS_ENGINE_BACKLOG.md §2.3.

CREATE TABLE IF NOT EXISTS "logistics_vehicles" (
  "id"               VARCHAR(64)    NOT NULL,
  "driverId"         VARCHAR(64)    NOT NULL,
  "vehicleType"      VARCHAR(20)    NOT NULL,
  "maxWeightKg"      DOUBLE PRECISION NOT NULL,
  "maxVolumeM3"      DOUBLE PRECISION,
  "cargoDimensions"  JSONB,
  "servesAreas"      JSONB          NOT NULL DEFAULT '[]',
  "operatingHours"   JSONB          NOT NULL DEFAULT '[]',
  "hasRefrigeration" BOOLEAN        NOT NULL DEFAULT false,
  "handlesFragile"   BOOLEAN        NOT NULL DEFAULT false,
  "isActive"         BOOLEAN        NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_vehicles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lvh_driverId_idx"    ON "logistics_vehicles"("driverId");
CREATE INDEX IF NOT EXISTS "lvh_vehicleType_idx" ON "logistics_vehicles"("vehicleType");
CREATE INDEX IF NOT EXISTS "lvh_isActive_idx"    ON "logistics_vehicles"("isActive");

CREATE TABLE IF NOT EXISTS "logistics_vehicle_tariffs" (
  "id"                        VARCHAR(64)    NOT NULL,
  "vehicleId"                 VARCHAR(64)    NOT NULL,
  "version"                   INTEGER        NOT NULL,
  "baseOperatingCostTzs"      DECIMAL(12,2)  NOT NULL,
  "costPerKmTzs"              DECIMAL(12,2)  NOT NULL,
  "costPerHourTzs"            DECIMAL(12,2)  NOT NULL,
  "minimumJobCompensationTzs" DECIMAL(12,2)  NOT NULL,
  "loadingFeeTzs"             DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "unloadingFeeTzs"           DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "waitingRateTzsPerMinute"   DECIMAL(12,2)  NOT NULL DEFAULT 0,
  "freeWaitMinutes"           INTEGER        NOT NULL DEFAULT 0,
  "isActive"                  BOOLEAN        NOT NULL DEFAULT true,
  "effectiveFrom"             TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"                 TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_vehicle_tariffs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "logistics_vehicle_tariffs_vehicleId_version_key" UNIQUE ("vehicleId", "version")
);
CREATE INDEX IF NOT EXISTS "lvt_vehicleId_isActive_idx" ON "logistics_vehicle_tariffs"("vehicleId", "isActive");
CREATE INDEX IF NOT EXISTS "lvt_isActive_idx"           ON "logistics_vehicle_tariffs"("isActive");