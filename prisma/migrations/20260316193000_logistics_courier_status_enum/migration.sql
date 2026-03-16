-- Introduce Logistics_CourierStatus enum and normalize existing values
DO $$ BEGIN
  CREATE TYPE "Logistics_CourierStatus" AS ENUM ('offline','online','busy','delivering','returning');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

UPDATE "logistics_couriers"
SET "status" = CASE
  WHEN "status" IS NULL THEN 'offline'
  WHEN LOWER("status") IN ('active','available') THEN 'online'
  WHEN LOWER("status") IN ('inactive') THEN 'offline'
  WHEN LOWER("status") IN ('assigned','busy') THEN 'busy'
  WHEN LOWER("status") IN ('in_transit','delivering') THEN 'delivering'
  WHEN LOWER("status") IN ('returning') THEN 'returning'
  WHEN LOWER("status") IN ('online','offline') THEN LOWER("status")
  ELSE 'offline'
END;

ALTER TABLE "logistics_couriers"
  ALTER COLUMN "status" TYPE "Logistics_CourierStatus"
  USING ("status"::text::"Logistics_CourierStatus");

ALTER TABLE "logistics_couriers"
  ALTER COLUMN "status" SET DEFAULT 'online';
