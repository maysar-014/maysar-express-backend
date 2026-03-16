/*
  Warnings:

  - You are about to drop the column `isActive` on the `auth_users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `auth_users` table. All the data in the column will be lost.
  - The `role` column on the `auth_users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `auth_otps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_wallets` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ipAddress` to the `auth_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAgent` to the `auth_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `auth_users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "auth_otps" DROP CONSTRAINT "auth_otps_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_order_items" DROP CONSTRAINT "order_order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_walletId_fkey";

-- DropIndex
DROP INDEX "catalog_match_confirmations_sellerId_idx";

-- DropIndex
DROP INDEX "catalog_match_confirmations_status_idx";

-- DropIndex
DROP INDEX "catalog_product_match_audits_sellerId_idx";

-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "ipAddress" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT NOT NULL,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "auth_users" DROP COLUMN "isActive",
DROP COLUMN "password",
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockoutUntil" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "status" "Auth_UserStatus" NOT NULL DEFAULT 'pending_verification',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Auth_UserRole" NOT NULL DEFAULT 'buyer',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "auth_otps";

-- DropTable
DROP TABLE "order_order_items";

-- DropTable
DROP TABLE "order_orders";

-- DropTable
DROP TABLE "payment_payments";

-- DropTable
DROP TABLE "payment_transactions";

-- DropTable
DROP TABLE "payment_wallets";

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB,
    "quietHours" JSONB,
    "frequency" VARCHAR(20),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_device_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(20),
    "deviceId" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notification_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_channel_key" ON "notification_preferences"("userId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_device_tokens_token_key" ON "notification_device_tokens"("token");

-- CreateIndex
CREATE INDEX "notification_device_tokens_userId_idx" ON "notification_device_tokens"("userId");

-- CreateIndex
CREATE INDEX "notification_device_tokens_isActive_idx" ON "notification_device_tokens"("isActive");
