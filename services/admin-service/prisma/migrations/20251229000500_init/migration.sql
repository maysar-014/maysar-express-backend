-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'support',
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "permissions" JSONB NOT NULL,
    "lastLoginAt" TIMESTAMP(6),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" VARCHAR(255),
    "ipWhitelist" TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adminId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" VARCHAR(500),
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "requesterId" UUID NOT NULL,
    "reviewerId" UUID,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'medium',
    "justification" VARCHAR(1000) NOT NULL,
    "approvedAt" TIMESTAMP(6),
    "rejectedAt" TIMESTAMP(6),
    "rejectionReason" VARCHAR(500),
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "AdminActionType" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'pending',
    "adminId" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "parameters" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(6),
    "executedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "type" "ConfigType" NOT NULL DEFAULT 'feature_flag',
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" "BulkOperationType" NOT NULL,
    "status" "BulkStatus" NOT NULL DEFAULT 'pending',
    "adminId" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "parameters" JSONB NOT NULL,
    "results" JSONB,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_expiresAt_idx" ON "approval_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_actions_status_idx" ON "admin_actions"("status");

-- CreateIndex
CREATE INDEX "admin_actions_scheduledAt_idx" ON "admin_actions"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "bulk_operations_status_idx" ON "bulk_operations"("status");

-- CreateIndex
CREATE INDEX "bulk_operations_adminId_idx" ON "bulk_operations"("adminId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('support', 'moderator', 'manager', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('financial', 'user_action', 'system_change', 'emergency');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('user_suspend', 'user_activate', 'order_cancel', 'order_refund', 'product_update', 'seller_verify', 'system_config');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('feature_flag', 'system_setting', 'rate_limit', 'maintenance_mode');

-- CreateEnum
CREATE TYPE "BulkOperationType" AS ENUM ('user_export', 'user_update', 'product_update', 'order_export', 'notification_send');

-- CreateEnum
CREATE TYPE "BulkStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
