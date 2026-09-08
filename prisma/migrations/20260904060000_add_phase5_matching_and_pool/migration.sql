-- Migration: Add Phase 5 matching + pool tables
-- Logistics_DriverMatchAudit (append-only matching audit, §5.1)
-- Logistics_RouteInsertionCandidate (insertion opportunity records, §5.2)
-- Logistics_ShipmentPoolEntry (continuous shipment opportunity pool, §5.3)
-- Logistics_PoolOptimizationRun (per-run pool analytics, §5.3)

CREATE TABLE IF NOT EXISTS "logistics_driver_match_audits" (
  "id"                      VARCHAR(64)   NOT NULL,
  "deliveryJobId"           VARCHAR(64)   NOT NULL,
  "driverId"                VARCHAR(64)   NOT NULL,
  "vehicleId"               VARCHAR(64),
  "vehicleType"             VARCHAR(20)   NOT NULL,
  "score"                   DECIMAL(8,4)  NOT NULL,
  "eligible"                BOOLEAN       NOT NULL,
  "exclusionReason"         VARCHAR(50),
  "scoreComponents"         JSONB         NOT NULL,
  "estimatedCompensationTzs" DECIMAL(12,2) NOT NULL,
  "etaMinutes"              INTEGER       NOT NULL,
  "distanceToPickupKm"      DECIMAL(8,2)  NOT NULL,
  "matchedAt"               TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_driver_match_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ldma_deliveryJobId_idx" ON "logistics_driver_match_audits"("deliveryJobId");
CREATE INDEX IF NOT EXISTS "ldma_driverId_idx" ON "logistics_driver_match_audits"("driverId");

CREATE TABLE IF NOT EXISTS "logistics_route_insertion_candidates" (
  "id"                        VARCHAR(64)  NOT NULL,
  "shipmentId"                VARCHAR(64)  NOT NULL,
  "deliveryJobId"             VARCHAR(64)  NOT NULL,
  "marginalCostTzs"           DOUBLE PRECISION NOT NULL,
  "additionalDistanceKm"      DOUBLE PRECISION NOT NULL,
  "additionalDurationMinutes" DOUBLE PRECISION NOT NULL,
  "feasible"                  BOOLEAN      NOT NULL,
  "rejectionReason"           VARCHAR(64),
  "evaluatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_route_insertion_candidates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lric_deliveryJobId_idx" ON "logistics_route_insertion_candidates"("deliveryJobId");
CREATE INDEX IF NOT EXISTS "lric_shipmentId_idx" ON "logistics_route_insertion_candidates"("shipmentId");

CREATE TABLE IF NOT EXISTS "logistics_shipment_pool" (
  "id"                  VARCHAR(64)  NOT NULL,
  "shipmentId"          VARCHAR(64)  NOT NULL,
  "status"              VARCHAR(32)  NOT NULL,
  "originLat"           DOUBLE PRECISION NOT NULL,
  "originLng"           DOUBLE PRECISION NOT NULL,
  "destinationLat"      DOUBLE PRECISION NOT NULL,
  "destinationLng"      DOUBLE PRECISION NOT NULL,
  "packageWeightKg"     DOUBLE PRECISION NOT NULL,
  "requiredVehicleClass" VARCHAR(16),
  "windowEarliestAt"    TIMESTAMP(3),
  "windowLatestAt"      TIMESTAMP(3),
  "refreshedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_shipment_pool_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lsp_shipmentId_key" ON "logistics_shipment_pool"("shipmentId");
CREATE INDEX IF NOT EXISTS "lsp_status_idx" ON "logistics_shipment_pool"("status");

CREATE TABLE IF NOT EXISTS "logistics_pool_optimization_runs" (
  "id"                          VARCHAR(64)   NOT NULL,
  "shipmentsEvaluated"          INTEGER       NOT NULL,
  "consolidationCandidatesFound" INTEGER      NOT NULL,
  "jobsCreated"                 INTEGER       NOT NULL,
  "averageSavingsPerJobTzs"     DECIMAL(12,2) NOT NULL,
  "durationMs"                  INTEGER       NOT NULL,
  "ranAt"                       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_pool_optimization_runs_pkey" PRIMARY KEY ("id")
);
