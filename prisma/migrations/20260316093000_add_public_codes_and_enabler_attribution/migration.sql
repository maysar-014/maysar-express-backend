-- Add public user codes
ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "publicCode" VARCHAR(16);
ALTER TABLE "auth_user_sync" ADD COLUMN IF NOT EXISTS "publicCode" VARCHAR(16);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publicCode" VARCHAR(16);

-- Unique indexes for public codes
CREATE UNIQUE INDEX IF NOT EXISTS "auth_users_publicCode_key" ON "auth_users"("publicCode");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_sync_publicCode_key" ON "auth_user_sync"("publicCode");
CREATE UNIQUE INDEX IF NOT EXISTS "users_publicCode_key" ON "users"("publicCode");

-- Add enabler codes to profiles
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "enablerCode" VARCHAR(16);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "enablerCodeShort" VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_profiles_enablerCode_key" ON "enabler_profiles"("enablerCode");
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_profiles_enablerCodeShort_key" ON "enabler_profiles"("enablerCodeShort");

-- Add enabler configuration to products
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "enablerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "enablerCommissionRate" DECIMAL(5,4);

-- Add enabler attribution to checkout sessions
ALTER TABLE "Checkout_CheckoutSession" ADD COLUMN IF NOT EXISTS "enablerId" TEXT;
ALTER TABLE "Checkout_CheckoutSession" ADD COLUMN IF NOT EXISTS "enablerCode" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "Checkout_CheckoutSession_enablerId_idx" ON "Checkout_CheckoutSession"("enablerId");

-- Add enabler attribution to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "enablerId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "enablerCode" VARCHAR(16);
