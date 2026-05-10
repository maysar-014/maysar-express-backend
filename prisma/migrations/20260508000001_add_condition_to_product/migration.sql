-- Add condition field to catalog_products
-- Values: 'new' | 'used' | 'refurbished' | 'damaged' (default: 'new')
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "condition" VARCHAR(20) NOT NULL DEFAULT 'new';
