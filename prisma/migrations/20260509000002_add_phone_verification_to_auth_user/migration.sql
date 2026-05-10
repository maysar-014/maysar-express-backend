-- Add phone verification fields to auth_user_sync table
ALTER TABLE "auth_user_sync" ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20);
ALTER TABLE "auth_user_sync" ADD COLUMN IF NOT EXISTS "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
