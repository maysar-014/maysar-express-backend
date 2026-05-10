-- Add product review system tables
-- Catalog_ModerationStatus enum
CREATE TYPE "Catalog_ModerationStatus" AS ENUM ('VISIBLE', 'FLAGGED', 'HIDDEN');

-- Catalog_ProductReview table
CREATE TABLE "catalog_product_reviews" (
    "id"               VARCHAR(64) NOT NULL,
    "productId"        VARCHAR(64) NOT NULL,
    "buyerId"          VARCHAR(64) NOT NULL,
    "rating"           INTEGER NOT NULL,
    "comment"          TEXT,
    "moderationStatus" "Catalog_ModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "submittedAt"      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_product_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_product_reviews_productId_buyerId_key" UNIQUE ("productId", "buyerId")
);

CREATE INDEX "catalog_product_reviews_productId_moderationStatus_idx" ON "catalog_product_reviews"("productId", "moderationStatus");
CREATE INDEX "catalog_product_reviews_buyerId_idx" ON "catalog_product_reviews"("buyerId");

-- Catalog_ReviewModerationLog table
CREATE TABLE "catalog_review_moderation_logs" (
    "id"             VARCHAR(64) NOT NULL,
    "reviewId"       VARCHAR(64) NOT NULL,
    "adminId"        VARCHAR(64) NOT NULL,
    "previousStatus" "Catalog_ModerationStatus" NOT NULL,
    "newStatus"      "Catalog_ModerationStatus" NOT NULL,
    "actionAt"       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_review_moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_review_moderation_logs_reviewId_idx" ON "catalog_review_moderation_logs"("reviewId");
CREATE INDEX "catalog_review_moderation_logs_adminId_idx" ON "catalog_review_moderation_logs"("adminId");

ALTER TABLE "catalog_review_moderation_logs" ADD CONSTRAINT "catalog_review_moderation_logs_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "catalog_product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
