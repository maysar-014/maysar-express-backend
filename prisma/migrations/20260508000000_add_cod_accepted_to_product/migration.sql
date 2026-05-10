-- Add codAccepted field to catalog_products
-- Sellers can explicitly enable COD per product (default: false)
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "codAccepted" BOOLEAN NOT NULL DEFAULT false;
