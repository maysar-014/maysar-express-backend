-- Introduce Logistics_CourierStatus enum and normalize existing values
DO $$ BEGIN
  CREATE TYPE "Logistics_CourierStatus" AS ENUM ('offline','online','busy','delivering','returning');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

UPDATE "logistics_couriers"
SET "status" = CASE
  WHEN "status" IS NULL THEN 'offline'
  WHEN LOWER("status"::text) IN ('active','available') THEN 'online'
  WHEN LOWER("status"::text) IN ('inactive') THEN 'offline'
  WHEN LOWER("status"::text) IN ('assigned','busy') THEN 'busy'
  WHEN LOWER("status"::text) IN ('in_transit','delivering') THEN 'delivering'
  WHEN LOWER("status"::text) IN ('returning') THEN 'returning'
  WHEN LOWER("status"::text) IN ('online','offline') THEN LOWER("status"::text)
  ELSE 'offline'
END;

ALTER TABLE "logistics_couriers"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "logistics_couriers"
  ALTER COLUMN "status" TYPE "Logistics_CourierStatus"
  USING ("status"::text::"Logistics_CourierStatus");

ALTER TABLE "logistics_couriers"
  ALTER COLUMN "status" SET DEFAULT 'online';
