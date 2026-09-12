-- Payment Method Configuration & Environment Control
--  1. MIXX_BY_YAS method (Tigo Pesa → Mixx by Yas rebrand) added to the method enum
--  2. Per-payment operational environment (SANDBOX | LIVE) — stamped by the
--     payment service from the method's configured mode at creation time
--  3. Idempotency key for payment initiation duplicate protection
--  4. Explicit failure codes (METHOD_DISABLED, METHOD_MISCONFIGURED, ...)

ALTER TYPE "Payment_PaymentMethod" ADD VALUE IF NOT EXISTS 'MIXX_BY_YAS';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "environment" VARCHAR(10) NOT NULL DEFAULT 'SANDBOX';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(128);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failureCode" VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "payments_environment_idx" ON "payments"("environment");