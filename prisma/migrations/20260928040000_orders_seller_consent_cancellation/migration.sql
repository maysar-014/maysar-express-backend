-- Seller-consent cancellation workflow.
--
-- CancellationPolicy deliberately requires SELLER CONSENT before a buyer can
-- cancel an order that has already been paid for (CONFIRMED), returning
-- `requiresSellerConsent: true`. That path was unreachable: no consent endpoint
-- existed, so the policy could only ever produce a dead-end 403.
--
-- These columns persist the request/decision so the state is auditable and the
-- request survives a restart. Nullable throughout: an order with no consent
-- request has never had one made.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelRequestStatus" VARCHAR(32);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelRequestedAt" TIMESTAMP(6);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelRequestedBy" VARCHAR(64);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelDecidedAt" TIMESTAMP(6);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelDecisionReason" TEXT;

CREATE INDEX IF NOT EXISTS "orders_cancelRequestStatus_idx" ON "orders" ("cancelRequestStatus");
