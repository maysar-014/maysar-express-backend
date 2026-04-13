DO $$ BEGIN
  CREATE TYPE "User_KycStatus" AS ENUM ('none', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "kycStatus" "User_KycStatus" NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "kycLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "kycSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "kycVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "kycData" JSONB,
  ADD COLUMN IF NOT EXISTS "kycNationalId" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "kycLimitMaxListings" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "kycLimitMaxTransactions" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "kycLimitMaxEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "users"
SET
  "kycStatus" = 'none',
  "kycLevel" = 0,
  "kycLimitMaxListings" = 5,
  "kycLimitMaxTransactions" = 1,
  "kycLimitMaxEarnings" = 0
WHERE "kycStatus" IS DISTINCT FROM 'none'
   OR "kycLevel" IS DISTINCT FROM 0
   OR "kycLimitMaxListings" IS DISTINCT FROM 5
   OR "kycLimitMaxTransactions" IS DISTINCT FROM 1
   OR "kycLimitMaxEarnings" IS DISTINCT FROM 0;

CREATE UNIQUE INDEX IF NOT EXISTS "users_kycNationalId_key" ON "users"("kycNationalId");

CREATE TABLE IF NOT EXISTS "kyc_audit_logs" (
  "id" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "action" TEXT NOT NULL,
  "previousLevel" INTEGER,
  "newLevel" INTEGER,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "performedBy" VARCHAR(64),
  "reason" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kyc_audit_logs_userId_timestamp_idx" ON "kyc_audit_logs"("userId", "timestamp");
