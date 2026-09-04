-- Migration: Add Delivery Job domain (Phase 2 §2.2)
-- Adds Logistics_DeliveryJob — one physical courier operation; may contain
-- multiple consolidated shipments. See LOGISTICS_ENGINE_BACKLOG.md §2.2.

CREATE TABLE IF NOT EXISTS "logistics_delivery_jobs" (
  "id"                  VARCHAR(64)    NOT NULL,
  "shipmentIds"         JSONB          NOT NULL DEFAULT '[]',
  "driverId"            VARCHAR(64),
  "vehicleId"           VARCHAR(64),
  "routeId"             VARCHAR(64),
  "status"              VARCHAR(32)    NOT NULL DEFAULT 'PENDING',
  "failureReason"       VARCHAR(40),
  "scheduledPickupAt"   TIMESTAMP(3),
  "estimatedDeliveryAt" TIMESTAMP(3),
  "actualPickupAt"      TIMESTAMP(3),
  "actualDeliveryAt"    TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_delivery_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ldj_status_idx"   ON "logistics_delivery_jobs"("status");
CREATE INDEX IF NOT EXISTS "ldj_driverId_idx" ON "logistics_delivery_jobs"("driverId");
