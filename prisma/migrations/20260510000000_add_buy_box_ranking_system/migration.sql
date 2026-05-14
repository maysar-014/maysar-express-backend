-- CreateEnum
CREATE TYPE "Catalog_AssignmentType" AS ENUM ('MERIT', 'EXPLORATION');

-- AlterTable
ALTER TABLE "catalog_buy_boxes" ADD COLUMN "compositeScore" DOUBLE PRECISION,
ADD COLUMN "assignmentType" "Catalog_AssignmentType";

-- AlterTable
ALTER TABLE "catalog_buy_box_alternatives" ADD COLUMN "compositeScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "catalog_category_strategies" (
    "id" VARCHAR(64) NOT NULL,
    "categoryId" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "explorationBudget" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdByOperatorId" VARCHAR(64) NOT NULL,

    CONSTRAINT "catalog_category_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_score_snapshots" (
    "id" VARCHAR(64) NOT NULL,
    "productId" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "signalValues" JSONB NOT NULL,
    "signalWeights" JSONB NOT NULL,
    "assignmentType" "Catalog_AssignmentType" NOT NULL,
    "strategyName" TEXT NOT NULL,
    "geographicZone" TEXT,
    "anomalyFlags" JSONB,
    "computedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_anomaly_flags" (
    "id" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "signalName" TEXT NOT NULL,
    "detectedValue" DOUBLE PRECISION NOT NULL,
    "expectedMin" DOUBLE PRECISION NOT NULL,
    "expectedMax" DOUBLE PRECISION NOT NULL,
    "flaggedAt" TIMESTAMP(6) NOT NULL,
    "clearedAt" TIMESTAMP(6),
    "clearedByOperatorId" TEXT,

    CONSTRAINT "catalog_anomaly_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_buy_box_overrides" (
    "id" VARCHAR(64) NOT NULL,
    "productId" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "operatorId" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "startAt" TIMESTAMP(6) NOT NULL,
    "endAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_buy_box_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_zone_performance" (
    "id" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "geographicZone" TEXT NOT NULL,
    "deliverySuccessRate" DOUBLE PRECISION NOT NULL,
    "avgDeliveryDays" DOUBLE PRECISION NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_zone_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_operator_audit_logs" (
    "id" VARCHAR(64) NOT NULL,
    "operatorId" VARCHAR(64) NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_operator_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_category_strategies_categoryId_key" ON "catalog_category_strategies"("categoryId");

-- CreateIndex
CREATE INDEX "catalog_score_snapshots_productId_computedAt_idx" ON "catalog_score_snapshots"("productId", "computedAt");

-- CreateIndex
CREATE INDEX "catalog_score_snapshots_sellerId_idx" ON "catalog_score_snapshots"("sellerId");

-- CreateIndex
CREATE INDEX "catalog_anomaly_flags_sellerId_flaggedAt_idx" ON "catalog_anomaly_flags"("sellerId", "flaggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_buy_box_overrides_productId_key" ON "catalog_buy_box_overrides"("productId");

-- CreateIndex
CREATE INDEX "catalog_buy_box_overrides_productId_endAt_idx" ON "catalog_buy_box_overrides"("productId", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_zone_performance_sellerId_geographicZone_key" ON "catalog_zone_performance"("sellerId", "geographicZone");

-- CreateIndex
CREATE INDEX "catalog_operator_audit_logs_entityType_entityId_idx" ON "catalog_operator_audit_logs"("entityType", "entityId");
