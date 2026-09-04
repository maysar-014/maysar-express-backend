-- AlterTable
ALTER TABLE "Checkout_CheckoutSession" ADD COLUMN     "pricingVersion" INTEGER,
ADD COLUMN     "quoteId" VARCHAR(64);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "pricingVersion" INTEGER,
ADD COLUMN     "quoteId" VARCHAR(64);

-- CreateTable
CREATE TABLE "logistics_quotes" (
    "id" VARCHAR(64) NOT NULL,
    "deliveryFee" DECIMAL(12,2) NOT NULL,
    "courierCompensationEstimate" DECIMAL(12,2) NOT NULL,
    "platformMarginAmount" DECIMAL(12,2) NOT NULL,
    "pricingVersion" INTEGER NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "originAddress" VARCHAR(500) NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "destinationAddress" VARCHAR(500) NOT NULL,
    "packageWeightKg" DOUBLE PRECISION NOT NULL,
    "deliveryZone" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "unavailableReason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_pricing_configs" (
    "version" INTEGER NOT NULL,
    "baseFee" DECIMAL(12,2) NOT NULL,
    "distanceRateTzsPerKm" DECIMAL(10,4) NOT NULL,
    "timeRateTzsPerMinute" DECIMAL(10,4) NOT NULL,
    "packageWeightTiers" JSONB NOT NULL,
    "zoneMultipliers" JSONB NOT NULL,
    "operationalSurcharge" JSONB NOT NULL,
    "riskSurchargeRateCod" DECIMAL(6,4) NOT NULL,
    "platformMarginPct" DECIMAL(6,4) NOT NULL,
    "floorPriceTzs" DECIMAL(12,2) NOT NULL,
    "ceilingPriceTzs" DECIMAL(12,2) NOT NULL,
    "roundingIncrementTzs" INTEGER NOT NULL,
    "quoteValiditySeconds" INTEGER NOT NULL,
    "routingCacheTtlMs" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_pricing_configs_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "logistics_pricing_audit_records" (
    "id" VARCHAR(64) NOT NULL,
    "orderId" VARCHAR(64),
    "quoteId" VARCHAR(64) NOT NULL,
    "pricingVersion" INTEGER NOT NULL,
    "courierCompensationEstimate" DECIMAL(12,2) NOT NULL,
    "buyerDeliveryFee" DECIMAL(12,2) NOT NULL,
    "platformMarginAmount" DECIMAL(12,2) NOT NULL,
    "deliveryZone" VARCHAR(20),
    "packageWeightKg" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMinutes" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_pricing_audit_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logistics_quotes_status_expiresAt_idx" ON "logistics_quotes"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "logistics_quotes_issuedAt_idx" ON "logistics_quotes"("issuedAt");

-- CreateIndex
CREATE INDEX "logistics_pricing_configs_isActive_idx" ON "logistics_pricing_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_pricing_audit_records_quoteId_key" ON "logistics_pricing_audit_records"("quoteId");

-- CreateIndex
CREATE INDEX "logistics_pricing_audit_records_orderId_idx" ON "logistics_pricing_audit_records"("orderId");

-- CreateIndex
CREATE INDEX "logistics_pricing_audit_records_pricingVersion_idx" ON "logistics_pricing_audit_records"("pricingVersion");

-- CreateIndex
CREATE INDEX "logistics_pricing_audit_records_recordedAt_idx" ON "logistics_pricing_audit_records"("recordedAt");

-- AddForeignKey
ALTER TABLE "logistics_pricing_audit_records" ADD CONSTRAINT "logistics_pricing_audit_records_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "logistics_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
