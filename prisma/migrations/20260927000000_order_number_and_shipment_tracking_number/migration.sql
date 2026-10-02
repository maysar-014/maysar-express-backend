-- Order numbers and shipment tracking numbers are two separate namespaces.
--
--   * Order number  ORD-YYYYMMDD-NLNL  identifies the WHOLE order for its entire
--     lifecycle (customer + Maysar staff reference). One order can contain
--     several shipments, so an order number is never a shipment identifier.
--   * Shipment tracking number  TRK-NLNLNL  is owned by ONE shipment. Every
--     shipment (one per seller group) gets its own independent number.
--
-- Therefore: the order-level tracking number column is retired and each row in
-- logistics_shipments gains its own tracking number.
--
-- Backfill is deterministic: derived from the shipment id via md5 so re-running
-- the migration yields identical values, digits land in the N positions (2-9)
-- and letters in the L positions (A-Z without I, L and O). The same alphabets
-- are enforced by shared/ids/human-readable-ids.ts.

ALTER TABLE "logistics_shipments" ADD COLUMN IF NOT EXISTS "trackingNumber" VARCHAR(16);

UPDATE "logistics_shipments"
SET "trackingNumber" =
  'TRK-' ||
  translate(translate(substr(md5("id"), 1, 1), 'abcdef', '234567'), '01', '23') ||
  upper(translate(substr(md5("id"), 2, 1), '0123456789', 'ABCDEFGHJK')) ||
  translate(translate(substr(md5("id"), 3, 1), 'abcdef', '234567'), '01', '23') ||
  upper(translate(substr(md5("id"), 4, 1), '0123456789', 'ABCDEFGHJK')) ||
  translate(translate(substr(md5("id"), 5, 1), 'abcdef', '234567'), '01', '23') ||
  upper(translate(substr(md5("id"), 6, 1), '0123456789', 'ABCDEFGHJK'))
WHERE "trackingNumber" IS NULL;

-- Fail loudly (transaction rolls back) rather than silently losing a shipment's
-- identity if the hash backfill ever produced a duplicate. TRK-NLNLNL has
-- 8*23*8*23*8*23 ≈ 6.2M values; re-run with a longer seed if this ever fires.
DO $$
DECLARE duplicate_groups integer;
BEGIN
  SELECT count(*) INTO duplicate_groups FROM (
    SELECT "trackingNumber"
    FROM "logistics_shipments"
    WHERE "trackingNumber" IS NOT NULL
    GROUP BY "trackingNumber"
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION 'Shipment tracking number backfill produced % duplicate value(s)', duplicate_groups;
  END IF;
END $$;

ALTER TABLE "logistics_shipments" ALTER COLUMN "trackingNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "logistics_shipments_trackingNumber_key"
  ON "logistics_shipments" ("trackingNumber");

-- The order keeps its number (primary key) for the whole lifecycle; the separate
-- order-level tracking number no longer exists.
ALTER TABLE "orders" DROP COLUMN IF EXISTS "trackingNumber";
