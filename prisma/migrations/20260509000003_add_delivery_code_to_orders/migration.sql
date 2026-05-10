-- Add delivery confirmation code to orders
-- 6-digit code generated at order creation, shown to buyer, verified by courier at delivery
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryCode" VARCHAR(6);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryCodeUsedAt" TIMESTAMP(6);
