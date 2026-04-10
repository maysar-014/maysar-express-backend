-- The live Railway database still has the legacy UUID-based enabler tables.
-- The current app code and Prisma schema use prefixed string IDs, so we
-- realign the empty enabler tables here before creating enabler_tasks.
ALTER TABLE IF EXISTS "enabler_analytics" DROP CONSTRAINT IF EXISTS "enabler_analytics_enablerId_fkey";
ALTER TABLE IF EXISTS "enabler_commissions" DROP CONSTRAINT IF EXISTS "enabler_commissions_enablerId_fkey";
ALTER TABLE IF EXISTS "enabler_commissions" DROP CONSTRAINT IF EXISTS "enabler_commissions_enablerOrderId_fkey";
ALTER TABLE IF EXISTS "enabler_orders" DROP CONSTRAINT IF EXISTS "enabler_orders_enablerId_fkey";
ALTER TABLE IF EXISTS "enabler_policies" DROP CONSTRAINT IF EXISTS "enabler_policies_enablerId_fkey";
ALTER TABLE IF EXISTS "enabler_product_listings" DROP CONSTRAINT IF EXISTS "enabler_product_listings_enablerId_fkey";

ALTER TABLE IF EXISTS "enabler_profiles"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text;

ALTER TABLE IF EXISTS "enabler_product_listings"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text,
    ALTER COLUMN "enablerId" TYPE VARCHAR(64) USING "enablerId"::text,
    ALTER COLUMN "productId" TYPE VARCHAR(64) USING "productId"::text,
    ALTER COLUMN "sellerId" TYPE VARCHAR(64) USING "sellerId"::text;

ALTER TABLE IF EXISTS "enabler_orders"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text,
    ALTER COLUMN "enablerId" TYPE VARCHAR(64) USING "enablerId"::text,
    ALTER COLUMN "orderId" TYPE VARCHAR(64) USING "orderId"::text,
    ALTER COLUMN "sellerId" TYPE VARCHAR(64) USING "sellerId"::text,
    ALTER COLUMN "buyerId" TYPE VARCHAR(64) USING "buyerId"::text,
    ALTER COLUMN "productListingId" TYPE VARCHAR(64) USING "productListingId"::text;

ALTER TABLE IF EXISTS "enabler_commissions"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text,
    ALTER COLUMN "enablerId" TYPE VARCHAR(64) USING "enablerId"::text,
    ALTER COLUMN "enablerOrderId" TYPE VARCHAR(64) USING "enablerOrderId"::text,
    ALTER COLUMN "commissionId" TYPE VARCHAR(64) USING "commissionId"::text,
    ALTER COLUMN "approvedBy" TYPE VARCHAR(64) USING "approvedBy"::text,
    ALTER COLUMN "payoutId" TYPE VARCHAR(64) USING "payoutId"::text;

ALTER TABLE IF EXISTS "enabler_policies"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text,
    ALTER COLUMN "enablerId" TYPE VARCHAR(64) USING "enablerId"::text,
    ALTER COLUMN "createdBy" TYPE VARCHAR(64) USING "createdBy"::text;

ALTER TABLE IF EXISTS "enabler_analytics"
    ALTER COLUMN "id" TYPE VARCHAR(64) USING "id"::text,
    ALTER COLUMN "enablerId" TYPE VARCHAR(64) USING "enablerId"::text;

CREATE TABLE IF NOT EXISTS "production_bulk_order_requests" (
    "id" VARCHAR(64) NOT NULL,
    "supplierId" VARCHAR(64) NOT NULL,
    "buyerId" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "productId" VARCHAR(64),
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(64) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "targetUnitPrice" DECIMAL(12,2),
    "requiredBy" TIMESTAMP(6) NOT NULL,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "status" VARCHAR(32) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_bulk_order_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "production_bulk_order_quotes" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "supplierId" VARCHAR(64) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "minimumOrderQuantity" DECIMAL(12,2),
    "validUntil" TIMESTAMP(6) NOT NULL,
    "notes" TEXT,
    "paymentTerms" TEXT,
    "status" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_bulk_order_quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "production_bulk_order_quotes_requestId_fkey" FOREIGN KEY ("requestId")
      REFERENCES "production_bulk_order_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "production_capacity_snapshots" (
    "id" VARCHAR(64) NOT NULL,
    "supplierId" VARCHAR(64) NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,
    "maxCapacity" DECIMAL(12,2) NOT NULL,
    "usedCapacity" DECIMAL(12,2) NOT NULL,
    "reservedCapacity" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "adjustedBy" VARCHAR(64),
    "reason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_capacity_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "enabler_tasks" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "taskType" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "sourceType" VARCHAR(64) NOT NULL,
    "sourceId" VARCHAR(64) NOT NULL,
    "sourceStatus" VARCHAR(32) NOT NULL,
    "campaignId" VARCHAR(64),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(6) NOT NULL,
    "endsAt" TIMESTAMP(6),
    "timezone" VARCHAR(64) NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricingRuleCount" INTEGER NOT NULL DEFAULT 0,
    "brief" TEXT,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rewardEstimate" DECIMAL(12,2),
    "acceptedAt" TIMESTAMP(6) NOT NULL,
    "acceptedByUserId" VARCHAR(64),
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enabler_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enabler_tasks_enablerId_fkey" FOREIGN KEY ("enablerId")
      REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE IF EXISTS "enabler_tasks"
    DROP CONSTRAINT IF EXISTS "enabler_tasks_enablerId_fkey";

ALTER TABLE IF EXISTS "enabler_tasks"
    ADD CONSTRAINT "enabler_tasks_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_analytics"
    ADD CONSTRAINT "enabler_analytics_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_commissions"
    ADD CONSTRAINT "enabler_commissions_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_commissions"
    ADD CONSTRAINT "enabler_commissions_enablerOrderId_fkey"
    FOREIGN KEY ("enablerOrderId")
    REFERENCES "enabler_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_orders"
    ADD CONSTRAINT "enabler_orders_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_policies"
    ADD CONSTRAINT "enabler_policies_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "enabler_product_listings"
    ADD CONSTRAINT "enabler_product_listings_enablerId_fkey"
    FOREIGN KEY ("enablerId")
    REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "production_bulk_order_quotes_requestId_supplierId_key"
    ON "production_bulk_order_quotes"("requestId", "supplierId");

CREATE UNIQUE INDEX IF NOT EXISTS "production_capacity_snapshots_supplierId_date_key"
    ON "production_capacity_snapshots"("supplierId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_tasks_enablerId_sourceType_sourceId_key"
    ON "enabler_tasks"("enablerId", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "production_bulk_order_requests_supplierId_status_idx"
    ON "production_bulk_order_requests"("supplierId", "status");

CREATE INDEX IF NOT EXISTS "production_bulk_order_requests_buyerId_idx"
    ON "production_bulk_order_requests"("buyerId");

CREATE INDEX IF NOT EXISTS "production_bulk_order_requests_requiredBy_idx"
    ON "production_bulk_order_requests"("requiredBy");

CREATE INDEX IF NOT EXISTS "production_bulk_order_quotes_supplierId_status_idx"
    ON "production_bulk_order_quotes"("supplierId", "status");

CREATE INDEX IF NOT EXISTS "production_bulk_order_quotes_validUntil_idx"
    ON "production_bulk_order_quotes"("validUntil");

CREATE INDEX IF NOT EXISTS "production_capacity_snapshots_supplierId_updatedAt_idx"
    ON "production_capacity_snapshots"("supplierId", "updatedAt");

CREATE INDEX IF NOT EXISTS "enabler_tasks_enablerId_status_idx"
    ON "enabler_tasks"("enablerId", "status");

CREATE INDEX IF NOT EXISTS "enabler_tasks_sellerId_idx"
    ON "enabler_tasks"("sellerId");

CREATE INDEX IF NOT EXISTS "enabler_tasks_taskType_status_idx"
    ON "enabler_tasks"("taskType", "status");
