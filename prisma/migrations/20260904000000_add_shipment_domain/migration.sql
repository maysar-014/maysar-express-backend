-- Migration: Add Shipment domain (Phase 2 §2.1)
-- Adds Logistics_Shipment — the atomic unit of physical movement.
-- Flow: Order → Shipment(s) → DeliveryJob(s). See LOGISTICS_ENGINE_BACKLOG.md §2.1.

CREATE TABLE IF NOT EXISTS "logistics_shipments" (
  "id"                      VARCHAR(64)    NOT NULL,
  "orderId"                 VARCHAR(64)    NOT NULL,
  "sellerId"                VARCHAR(64)    NOT NULL,
  "originLat"               DOUBLE PRECISION NOT NULL,
  "originLng"               DOUBLE PRECISION NOT NULL,
  "originAddress"           VARCHAR(255)   NOT NULL,
  "destinationLat"          DOUBLE PRECISION NOT NULL,
  "destinationLng"          DOUBLE PRECISION NOT NULL,
  "destinationAddress"      VARCHAR(255)   NOT NULL,
  "packageWeightKg"         DOUBLE PRECISION NOT NULL,
  "packageDimensions"       JSONB,
  "handlingRequirements"    JSONB          NOT NULL DEFAULT '{"fragile": false, "temperatureControlled": false, "hazmat": false}',
  "requestedDeliveryWindow" JSONB,
  "requiredVehicleClass"    VARCHAR(20),
  "status"                  VARCHAR(32)    NOT NULL DEFAULT 'CREATED',
  "failureReason"           VARCHAR(40),
  "deliveryJobId"           VARCHAR(64),
  "createdAt"               TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logistics_shipments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lsh_orderId_idx"      ON "logistics_shipments"("orderId");
CREATE INDEX IF NOT EXISTS "lsh_sellerId_idx"     ON "logistics_shipments"("sellerId");
CREATE INDEX IF NOT EXISTS "lsh_status_idx"       ON "logistics_shipments"("status");
CREATE INDEX IF NOT EXISTS "lsh_deliveryJobId_idx" ON "logistics_shipments"("deliveryJobId");
