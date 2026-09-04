-- Migration: Add four-concept cost model tables (Phase 3)
-- Logistics_CostAdjustment (immutable, attributed responsibility)
-- Logistics_LedgerEntry (append-only ledger)
-- Logistics_FulfillmentCommitment (absolute price lock)

CREATE TABLE IF NOT EXISTS "logistics_cost_adjustments" (
  "id"               VARCHAR(64)    NOT NULL,
  "deliveryJobId"    VARCHAR(64)    NOT NULL,
  "shipmentId"       VARCHAR(64),
  "adjustmentType"   VARCHAR(32)    NOT NULL,
  "amountTzs"        DECIMAL(12,2)  NOT NULL,
  "responsibleParty" VARCHAR(20)    NOT NULL,
  "reason"           TEXT           NOT NULL,
  "evidenceUrl"      VARCHAR(512),
  "recordedAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedBy"       VARCHAR(64)    NOT NULL,

  CONSTRAINT "logistics_cost_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lca_deliveryJobId_idx" ON "logistics_cost_adjustments"("deliveryJobId");
CREATE INDEX IF NOT EXISTS "lca_responsibleParty_idx" ON "logistics_cost_adjustments"("responsibleParty");

CREATE TABLE IF NOT EXISTS "logistics_ledger_entries" (
  "id"             VARCHAR(64)    NOT NULL,
  "deliveryJobId"  VARCHAR(64)    NOT NULL,
  "shipmentId"     VARCHAR(64),
  "entryType"      VARCHAR(40)    NOT NULL,
  "amountTzs"      DECIMAL(12,2)  NOT NULL,
  "counterpartyId" VARCHAR(64)    NOT NULL,
  "pricingVersion" INTEGER        NOT NULL,
  "tariffVersion"  INTEGER,
  "routingVersion" VARCHAR(64),
  "calculatedAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata"       JSONB          NOT NULL DEFAULT '{}',

  CONSTRAINT "logistics_ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lle_deliveryJobId_idx" ON "logistics_ledger_entries"("deliveryJobId");
CREATE INDEX IF NOT EXISTS "lle_entryType_idx"     ON "logistics_ledger_entries"("entryType");
CREATE INDEX IF NOT EXISTS "lle_counterpartyId_idx" ON "logistics_ledger_entries"("counterpartyId");

CREATE TABLE IF NOT EXISTS "logistics_fulfillment_commitments" (
  "id"                VARCHAR(64)    NOT NULL,
  "checkoutSessionId" VARCHAR(64)    NOT NULL,
  "quoteId"           VARCHAR(64)    NOT NULL,
  "buyerPriceTzs"     DECIMAL(12,2)  NOT NULL,
  "pricingVersion"    INTEGER        NOT NULL,
  "lockedAt"          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"         TIMESTAMP(3)   NOT NULL,
  "status"            VARCHAR(20)    NOT NULL DEFAULT 'LOCKED',

  CONSTRAINT "logistics_fulfillment_commitments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "logistics_fulfillment_commitments_quoteId_key" UNIQUE ("quoteId")
);
CREATE INDEX IF NOT EXISTS "lfc_checkoutSessionId_idx" ON "logistics_fulfillment_commitments"("checkoutSessionId");
CREATE INDEX IF NOT EXISTS "lfc_status_idx"            ON "logistics_fulfillment_commitments"("status");
