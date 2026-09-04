-- Migration: Add Tanzania canonical address fields to user_addresses
-- Adds ward, district, region, latitude, longitude; makes city nullable

ALTER TABLE "user_addresses"
  ADD COLUMN IF NOT EXISTS "ward"      TEXT,
  ADD COLUMN IF NOT EXISTS "district"  TEXT,
  ADD COLUMN IF NOT EXISTS "region"    TEXT,
  ADD COLUMN IF NOT EXISTS "latitude"  DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);

-- Make city nullable (was NOT NULL previously)
ALTER TABLE "user_addresses"
  ALTER COLUMN "city" DROP NOT NULL;
