-- Migration: Add seller stock verification workflow
-- Adds verification deadline fields, audit log table, and overdue polling index

-- Add verification fields to orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "verificationDeadlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationTimeoutMinutes" INTEGER DEFAULT 30;

-- Create order_verification_audit_logs table
CREATE TABLE IF NOT EXISTS "order_verification_audit_logs" (
  "id"             VARCHAR(64) NOT NULL,
  "orderId"        VARCHAR(64) NOT NULL,
  "entryType"      VARCHAR(32) NOT NULL,
  "actorType"      VARCHAR(16) NOT NULL,
  "actorId"        VARCHAR(64),
  "previousStatus" VARCHAR(64) NOT NULL,
  "newStatus"      VARCHAR(64) NOT NULL,
  "reason"         TEXT,
  "notes"          TEXT,
  "timestamp"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_verification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "order_verification_audit_logs"
  ADD CONSTRAINT "order_verification_audit_logs_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for efficient order history queries
CREATE INDEX IF NOT EXISTS "order_verification_audit_logs_orderId_timestamp_idx"
  ON "order_verification_audit_logs"("orderId", "timestamp");

-- Create index for overdue order polling
CREATE INDEX IF NOT EXISTS "orders_status_verificationDeadlineAt_idx"
  ON "orders"("status", "verificationDeadlineAt")
  WHERE "status" = 'PENDING_SELLER_VERIFICATION';
