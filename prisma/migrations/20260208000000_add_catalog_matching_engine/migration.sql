-- AlterTable catalog_products: Add matching fields
ALTER TABLE "catalog_products"
ADD COLUMN IF NOT EXISTS "gtin" VARCHAR(14),
    ADD COLUMN IF NOT EXISTS "mpn" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "isbn" VARCHAR(13),
    ADD COLUMN IF NOT EXISTS "fingerprint" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "fingerprintVersion" INTEGER NOT NULL DEFAULT 1;
-- CreateEnum for MatchLevel
DO $$ BEGIN CREATE TYPE "Catalog_MatchLevel" AS ENUM ('EXACT', 'STRONG', 'POSSIBLE', 'NO_MATCH');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateEnum for MatchDecision
DO $$ BEGIN CREATE TYPE "Catalog_MatchDecision" AS ENUM (
    'AUTO_MERGED',
    'SELLER_CONFIRMED',
    'SELLER_REJECTED',
    'NEW_PRODUCT',
    'PENDING'
);
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateEnum for MatchDecidedBy
DO $$ BEGIN CREATE TYPE "Catalog_MatchDecidedBy" AS ENUM ('SYSTEM', 'SELLER', 'ADMIN');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateEnum for ConfirmationStatus
DO $$ BEGIN CREATE TYPE "Catalog_ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateTable Catalog_ProductMatchAudit
CREATE TABLE IF NOT EXISTS "catalog_product_match_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidateProductId" VARCHAR(255) NOT NULL,
    "matchedProductId" VARCHAR(255),
    "matchLevel" "Catalog_MatchLevel" NOT NULL,
    "matchScore" DECIMAL(5, 2) NOT NULL,
    "matchingCriteria" JSONB NOT NULL,
    "decision" "Catalog_MatchDecision" NOT NULL,
    "decidedBy" "Catalog_MatchDecidedBy" NOT NULL,
    "sellerId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_product_match_audits_pkey" PRIMARY KEY ("id")
);
-- CreateTable Catalog_MatchConfirmation
CREATE TABLE IF NOT EXISTS "catalog_match_confirmations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auditId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "candidateProducts" JSONB NOT NULL,
    "status" "Catalog_ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "sellerChoice" VARCHAR(255),
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "respondedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_match_confirmations_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_gtin_idx" ON "catalog_products"("gtin");
CREATE INDEX IF NOT EXISTS "catalog_products_mpn_idx" ON "catalog_products"("mpn");
CREATE INDEX IF NOT EXISTS "catalog_products_isbn_idx" ON "catalog_products"("isbn");
CREATE INDEX IF NOT EXISTS "catalog_products_brand_model_categoryId_idx" ON "catalog_products"("brand", "model", "categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_categoryId_fingerprint_key" ON "catalog_products"("categoryId", "fingerprint");
-- CreateIndex for audit table
CREATE INDEX IF NOT EXISTS "catalog_product_match_audits_sellerId_idx" ON "catalog_product_match_audits"("sellerId");
CREATE INDEX IF NOT EXISTS "catalog_product_match_audits_matchLevel_idx" ON "catalog_product_match_audits"("matchLevel");
-- CreateIndex for confirmation table
CREATE INDEX IF NOT EXISTS "catalog_match_confirmations_sellerId_idx" ON "catalog_match_confirmations"("sellerId");
CREATE INDEX IF NOT EXISTS "catalog_match_confirmations_status_idx" ON "catalog_match_confirmations"("status");