-- Phase 5 growth loop: ops reviews DISCOVERED suppliers and marks them invite-ready
ALTER TABLE "request_suppliers" ADD COLUMN "inviteStatus" VARCHAR(24) NOT NULL DEFAULT 'PENDING';
CREATE INDEX "request_suppliers_invite_status_idx" ON "request_suppliers"("inviteStatus");