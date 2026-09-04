-- Migration: Scope product slug uniqueness from global to (sellerId, slug)
-- This allows different sellers to create products with the same slug,
-- fixing E2E test failures caused by cross-run slug collisions.

-- Drop the global unique constraint on slug
DROP INDEX IF EXISTS "catalog_products_slug_key";

-- Add the new composite unique constraint scoped to seller
-- Handles the case where the constraint may not exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'catalog_products_sellerId_slug_key'
  ) THEN
    ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_sellerId_slug_key" UNIQUE ("sellerId", "slug");
  END IF;
END $$;
