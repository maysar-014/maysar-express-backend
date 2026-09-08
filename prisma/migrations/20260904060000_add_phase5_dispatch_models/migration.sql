-- Phase 5: driver matching, route insertion, shipment pool

-- §5.1 audit column on the assignment record
ALTER TABLE "logistics_delivery_jobs" ADD COLUMN "matchAudit" JSONB;

-- §5.2 route insertion candidates
CREATE TABLE "logistics_route_insertion_candidates" (
    "id" VARCHAR(64) NOT NULL,
    "shipmentId" VARCHAR(64) NOT NULL,
    "deliveryJobId" VARCHAR(64) NOT NULL,
    "marginalCostTzs" DOUBLE PRECISION NOT NULL,
    "additionalDistanceKm" DOUBLE PRECISION NOT NULL,
    "additionalDurationMinutes" DOUBLE PRECISION NOT NULL,
    "feasible" BOOLEAN NOT NULL,
    "rejectionReason" VARCHAR(64),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logistics_route_insertion_candidates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "logistics_route_insertion_candidates_deliveryJobId_idx" ON "logistics_route_insertion_candidates"("deliveryJobId");
CREATE INDEX "logistics_route_insertion_candidates_shipmentId_idx" ON "logistics_route_insertion_candidates"("shipmentId");

-- §5.3 shipment opportunity pool (materialized snapshot)
CREATE TABLE "logistics_shipment_pool" (
    "id" VARCHAR(64) NOT NULL,
    "shipmentId" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "packageWeightKg" DOUBLE PRECISION NOT NULL,
    "requiredVehicleClass" VARCHAR(16),
    "windowEarliestAt" TIMESTAMP(3),
    "windowLatestAt" TIMESTAMP(3),
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "logistics_shipment_pool_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "logistics_shipment_pool_shipmentId_key" ON "logistics_shipment_pool"("shipmentId");
CREATE INDEX "logistics_shipment_pool_status_idx" ON "logistics_shipment_pool"("status");
