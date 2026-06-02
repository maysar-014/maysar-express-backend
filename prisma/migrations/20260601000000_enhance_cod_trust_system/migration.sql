-- Migration: enhance_cod_trust_system
-- Adds dual-axis tracking columns and new tables for the Enhanced COD Trust System

-- ─── Task 1.1: Extend order_cod_trust_scores ────────────────────────────────
ALTER TABLE "order_cod_trust_scores"
  ADD COLUMN "lifetimeCODValue" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "activeExposure"   BIGINT NOT NULL DEFAULT 0;

CREATE INDEX "order_cod_trust_scores_buyerId_activeExposure_idx"
  ON "order_cod_trust_scores"("buyerId", "activeExposure");

-- ─── Task 1.2: Identity graph edges ─────────────────────────────────────────
CREATE TABLE "order_cod_identity_links" (
  "id"            VARCHAR(64)  NOT NULL,
  "accountAId"    VARCHAR(64)  NOT NULL,
  "accountBId"    VARCHAR(64)  NOT NULL,
  "attributeType" VARCHAR(32)  NOT NULL,
  "attributeHash" VARCHAR(64)  NOT NULL,
  "disputedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_cod_identity_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_cod_identity_links_accountAId_idx"
  ON "order_cod_identity_links"("accountAId");
CREATE INDEX "order_cod_identity_links_accountBId_idx"
  ON "order_cod_identity_links"("accountBId");
CREATE INDEX "order_cod_identity_links_attributeHash_idx"
  ON "order_cod_identity_links"("attributeHash");

-- ─── Task 1.3: Per-order risk assessments ───────────────────────────────────
CREATE TABLE "order_cod_risk_assessments" (
  "id"                    VARCHAR(64)  NOT NULL,
  "buyerId"               VARCHAR(64)  NOT NULL,
  "orderId"               VARCHAR(64)  NOT NULL,
  "riskLevel"             VARCHAR(8)   NOT NULL,
  "activeFactors"         JSONB        NOT NULL,
  "requiresCommitmentFee" BOOLEAN      NOT NULL DEFAULT false,
  "requiresManualReview"  BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_cod_risk_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_cod_risk_assessments_buyerId_createdAt_idx"
  ON "order_cod_risk_assessments"("buyerId", "createdAt");
CREATE UNIQUE INDEX "order_cod_risk_assessments_orderId_key"
  ON "order_cod_risk_assessments"("orderId");

-- ─── Task 1.4: Seller COD risk tracking ─────────────────────────────────────
CREATE TABLE "order_seller_cod_risk" (
  "id"             VARCHAR(64)   NOT NULL,
  "sellerId"       VARCHAR(64)   NOT NULL,
  "disputeRate"    DECIMAL(5, 4) NOT NULL DEFAULT 0,
  "codSuspended"   BOOLEAN       NOT NULL DEFAULT false,
  "suspendedAt"    TIMESTAMP(3),
  "reinstatedAt"   TIMESTAMP(3),
  "lastComputedAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_seller_cod_risk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_seller_cod_risk_sellerId_key"
  ON "order_seller_cod_risk"("sellerId");

CREATE TABLE "order_seller_cod_risk_events" (
  "id"                 VARCHAR(64)   NOT NULL,
  "sellerId"           VARCHAR(64)   NOT NULL,
  "eventType"          VARCHAR(32)   NOT NULL,
  "signalType"         VARCHAR(64),
  "disputeRateAtEvent" DECIMAL(5, 4) NOT NULL,
  "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_seller_cod_risk_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_seller_cod_risk_events_sellerId_createdAt_idx"
  ON "order_seller_cod_risk_events"("sellerId", "createdAt");

-- ─── Dispute window expiry tracking (for OrderDeliveryConfirmedHandler) ──────
CREATE TABLE "order_cod_dispute_windows" (
  "id"        VARCHAR(64)  NOT NULL,
  "orderId"   VARCHAR(64)  NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "suspended" BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_cod_dispute_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_cod_dispute_windows_orderId_key"
  ON "order_cod_dispute_windows"("orderId");
CREATE INDEX "order_cod_dispute_windows_expiresAt_idx"
  ON "order_cod_dispute_windows"("expiresAt");
