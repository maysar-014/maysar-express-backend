-- Phase 5 — Driver Matching audit tables
-- (Route insertion candidates + shipment pool table already exist from
--  20260904060000_add_phase5_dispatch_models.)

-- §5.1 Audit of every driver-matching run. The matching score and all input
-- factors are stored per candidate — assignment decisions must be
-- explainable after the fact.
CREATE TABLE "logistics_driver_match_audits" (
  "id"                       VARCHAR(64)   NOT NULL,
  "deliveryJobId"            VARCHAR(64)   NOT NULL,
  "driverId"                 VARCHAR(64)   NOT NULL,
  "vehicleId"                VARCHAR(64),
  "vehicleType"              VARCHAR(20)   NOT NULL,
  "score"                    DOUBLE PRECISION NOT NULL,
  "eligible"                 BOOLEAN       NOT NULL,
  "exclusionReason"          VARCHAR(50),
  "scoreComponents"          JSONB         NOT NULL,
  "estimatedCompensationTzs" DOUBLE PRECISION NOT NULL,
  "etaMinutes"               INTEGER       NOT NULL,
  "distanceToPickupKm"       DOUBLE PRECISION NOT NULL,
  "matchedAt"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logistics_driver_match_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ldma_job_idx"    ON "logistics_driver_match_audits"("deliveryJobId");
CREATE INDEX "ldma_driver_idx" ON "logistics_driver_match_audits"("driverId");

-- §5.3 Per-run analytics of the pool optimization job. Feeds Phase 6 KPIs.
CREATE TABLE "logistics_pool_optimization_runs" (
  "id"                           VARCHAR(64)      NOT NULL,
  "shipmentsEvaluated"           INTEGER          NOT NULL,
  "consolidationCandidatesFound" INTEGER          NOT NULL,
  "jobsCreated"                  INTEGER          NOT NULL,
  "averageSavingsPerJobTzs"      DOUBLE PRECISION NOT NULL,
  "durationMs"                   INTEGER          NOT NULL,
  "ranAt"                        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logistics_pool_optimization_runs_pkey" PRIMARY KEY ("id")
);
