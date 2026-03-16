-- Add order tracking number
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingNumber" VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_trackingNumber_key" ON "orders"("trackingNumber");
