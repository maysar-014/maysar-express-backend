-- Seller-owned terms and capacity for enabler promotion applications.
CREATE TABLE IF NOT EXISTS "enabler_promotion_offers" (
    "id" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "scopeType" "enabler_scope_type" NOT NULL DEFAULT 'ALL_PRODUCTS',
    "earningRuleType" "enabler_earning_rule_type" NOT NULL DEFAULT 'PERCENTAGE_OF_ITEM_SUBTOTAL',
    "earningRuleValue" DECIMAL(10,4) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
    "requiredEnablerCount" INTEGER NOT NULL DEFAULT 1,
    "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "closedAt" TIMESTAMP(6),
    CONSTRAINT "enabler_promotion_offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enabler_promotion_offers_rate_check" CHECK ("earningRuleValue" > 0 AND "earningRuleValue" <= 50),
    CONSTRAINT "enabler_promotion_offers_capacity_check" CHECK ("requiredEnablerCount" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_promotion_offers_sellerId_key" ON "enabler_promotion_offers"("sellerId");
CREATE INDEX IF NOT EXISTS "enabler_promotion_offers_status_idx" ON "enabler_promotion_offers"("status");

ALTER TABLE "enabler_seller_authorizations"
    ADD COLUMN IF NOT EXISTS "promotionOfferId" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "enabler_seller_authorizations_promotionOfferId_status_idx"
    ON "enabler_seller_authorizations"("promotionOfferId", "status");

DO $$ BEGIN
    ALTER TABLE "enabler_seller_authorizations"
        ADD CONSTRAINT "enabler_seller_authorizations_promotionOfferId_fkey"
        FOREIGN KEY ("promotionOfferId") REFERENCES "enabler_promotion_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
