-- CreateEnum
CREATE TYPE "Auth_UserRole" AS ENUM ('buyer', 'seller', 'supplier', 'courier', 'enabler', 'system');

-- CreateEnum
CREATE TYPE "Auth_UserStatus" AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated', 'locked');

-- CreateEnum
CREATE TYPE "BusinessRegistry_BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_LIABILITY', 'CORPORATION');

-- CreateEnum
CREATE TYPE "BusinessRegistry_BusinessStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BusinessRegistry_VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessRegistry_ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "BusinessRegistry_AddressType" AS ENUM ('MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessRegistry_DocumentType" AS ENUM ('REGISTRATION_CERTIFICATE', 'TAX_CERTIFICATE', 'BUSINESS_LICENSE', 'PROOF_OF_ADDRESS', 'OWNER_ID');

-- CreateEnum
CREATE TYPE "BusinessRegistry_DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessRegistry_ComplianceType" AS ENUM ('TAX_COMPLIANCE', 'BUSINESS_LICENSE', 'HEALTH_PERMIT', 'ENVIRONMENTAL_CLEARANCE');

-- CreateEnum
CREATE TYPE "Catalog_MatchLevel" AS ENUM ('EXACT', 'STRONG', 'POSSIBLE', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "Catalog_MatchDecision" AS ENUM ('AUTO_MERGED', 'SELLER_CONFIRMED', 'SELLER_REJECTED', 'NEW_PRODUCT');

-- CreateEnum
CREATE TYPE "Catalog_MatchDecidedBy" AS ENUM ('SYSTEM', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Catalog_ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Catalog_ProductStatus" AS ENUM ('draft', 'pending', 'published', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "Catalog_Visibility" AS ENUM ('public', 'private', 'unlisted');

-- CreateEnum
CREATE TYPE "Catalog_InventoryPolicy" AS ENUM ('deny', 'allow');

-- CreateEnum
CREATE TYPE "Catalog_VariantStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "Catalog_AttributeType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "Commission_CommissionType" AS ENUM ('sale', 'referral', 'bonus', 'adjustment', 'task_assignment', 'task_completion', 'collaboration_setup');

-- CreateEnum
CREATE TYPE "Commission_CommissionStatus" AS ENUM ('pending', 'approved', 'paid', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "Commission_ReferralStatus" AS ENUM ('pending', 'completed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "Commission_RewardType" AS ENUM ('referral', 'loyalty', 'bonus', 'milestone', 'promotional');

-- CreateEnum
CREATE TYPE "Commission_RewardStatus" AS ENUM ('earned', 'redeemed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "Commission_PayoutStatus" AS ENUM ('pending', 'scheduled', 'processed', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "Community_PostType" AS ENUM ('text', 'image', 'video', 'link', 'poll', 'event');

-- CreateEnum
CREATE TYPE "Community_Visibility" AS ENUM ('public', 'followers', 'private');

-- CreateEnum
CREATE TYPE "Community_PostStatus" AS ENUM ('draft', 'published', 'hidden', 'deleted');

-- CreateEnum
CREATE TYPE "Community_UserStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "Community_CommentStatus" AS ENUM ('published', 'hidden', 'deleted');

-- CreateEnum
CREATE TYPE "Community_LikeType" AS ENUM ('like', 'love', 'laugh', 'angry', 'sad');

-- CreateEnum
CREATE TYPE "Community_FollowStatus" AS ENUM ('pending', 'accepted', 'blocked');

-- CreateEnum
CREATE TYPE "Community_ReportReason" AS ENUM ('spam', 'harassment', 'inappropriate_content', 'copyright_violation', 'hate_speech', 'misinformation', 'other');

-- CreateEnum
CREATE TYPE "Community_ReportStatus" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "Compliance_SubjectRightsRequestType" AS ENUM ('access', 'delete', 'portability', 'rectification');

-- CreateEnum
CREATE TYPE "Compliance_SubjectRightsRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "Compliance_ComplianceStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "Compliance_KYCStatus" AS ENUM ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "Compliance_KYCRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Compliance_RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Compliance_AssessmentStatus" AS ENUM ('in_progress', 'completed', 'requires_action');

-- CreateEnum
CREATE TYPE "Inventory_WarehouseType" AS ENUM ('central', 'regional', 'store');

-- CreateEnum
CREATE TYPE "Inventory_WarehouseStatus" AS ENUM ('active', 'inactive', 'maintenance');

-- CreateEnum
CREATE TYPE "Inventory_StockStatus" AS ENUM ('active', 'discontinued', 'damaged');

-- CreateEnum
CREATE TYPE "Inventory_ReservationStatus" AS ENUM ('active', 'fulfilled', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "Inventory_MovementType" AS ENUM ('inbound', 'outbound', 'transfer', 'adjustment', 'damage');

-- CreateEnum
CREATE TYPE "Inventory_CountStatus" AS ENUM ('in_progress', 'completed', 'reconciled', 'cancelled');

-- CreateEnum
CREATE TYPE "Inventory_CountType" AS ENUM ('full', 'spot', 'cycle');

-- CreateEnum
CREATE TYPE "Notification_NotificationType" AS ENUM ('email', 'sms', 'push', 'in_app', 'webhook');

-- CreateEnum
CREATE TYPE "Notification_NotificationPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Notification_NotificationStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "Notification_DeliveryStatus" AS ENUM ('sent', 'delivered', 'failed', 'bounced', 'complained', 'opened', 'clicked', 'unsubscribed');

-- CreateEnum
CREATE TYPE "Notification_TemplateStatus" AS ENUM ('active', 'inactive', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "Order_OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Order_PaymentMethod" AS ENUM ('COD', 'WALLET', 'CARD', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "Order_PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "Order_SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Payment_PaymentMethod" AS ENUM ('MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA', 'WALLET', 'BANK_TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "Payment_PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "Payment_RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Payout_PayoutMethod" AS ENUM ('BANK_TRANSFER', 'MOBILE_MONEY', 'WALLET');

-- CreateEnum
CREATE TYPE "Payout_PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Training_ContentType" AS ENUM ('TEXT', 'VIDEO', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "Training_DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "User_UserRole" AS ENUM ('buyer', 'seller', 'supplier', 'courier', 'enabler', 'system');

-- CreateEnum
CREATE TYPE "User_UserStatus" AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated', 'locked');

-- CreateEnum
CREATE TYPE "User_AddressType" AS ENUM ('home', 'work', 'billing', 'shipping');

-- CreateEnum
CREATE TYPE "Wallet_WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Wallet_TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE', 'TRANSFER_IN', 'TRANSFER_OUT', 'REFUND', 'FEE', 'ADJUSTMENT', 'DEBIT_FROZEN');

-- CreateEnum
CREATE TYPE "Wallet_HoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CAPTURED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Support_TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Support_TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Support_SenderType" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "enabler_status" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "enabler_tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "enabler_listing_status" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "enabler_order_status" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "Campaign_Type" AS ENUM ('DISCOUNT', 'PROMOTION', 'CLEARANCE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "Campaign_Status" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Campaign_RuleType" AS ENUM ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FIXED_PRICE', 'BUY_GET');

-- CreateEnum
CREATE TYPE "Campaign_ConditionType" AS ENUM ('MIN_ORDER_VALUE', 'MAX_USES_PER_CUSTOMER', 'CUSTOMER_SEGMENT', 'GEOGRAPHIC_REGION');

-- CreateEnum
CREATE TYPE "Community_ThreadStatus" AS ENUM ('OPEN', 'ACTIVE', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Community_ExpertiseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "Community_ReputationTier" AS ENUM ('NEWCOMER', 'CONTRIBUTOR', 'EXPERT', 'MENTOR', 'THOUGHT_LEADER');

-- CreateEnum
CREATE TYPE "Community_ReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Community_ChallengeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Sms_Status" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'UNDELIVERED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_EnablerAnalytics" (
    "enablerId" TEXT NOT NULL,
    "trainingsScheduled" INTEGER DEFAULT 0,
    "lastTrainingDate" TIMESTAMP(3),
    "certificatesIssued" INTEGER DEFAULT 0,
    "sellersOnboarded" INTEGER DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION DEFAULT 0.0,
    "lastActivity" TIMESTAMP(3),
    "supportTicketsResolved" INTEGER DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0.0,
    "salesSupported" INTEGER DEFAULT 0,
    "totalSalesValue" DOUBLE PRECISION DEFAULT 0.0,
    "conversionRate" DOUBLE PRECISION DEFAULT 0.0,
    "skillCertifications" INTEGER DEFAULT 0,
    "skillLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_EnablerAnalytics_pkey" PRIMARY KEY ("enablerId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_SellerMetrics" (
    "sellerId" TEXT NOT NULL,
    "averageOrderValue" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "customerLifetimeValue" DOUBLE PRECISION,
    "returnRate" DOUBLE PRECISION,
    "profitMargin" DOUBLE PRECISION,
    "activeVisitors" INTEGER,
    "cartAbandonment" INTEGER,
    "liveOrders" INTEGER,
    "inventoryAlerts" INTEGER,
    "customerInquiries" INTEGER,
    "todaySales" DECIMAL(12,2),
    "todayOrderCount" INTEGER,
    "thisMonthRevenue" DECIMAL(12,2),
    "lastMonthRevenue" DECIMAL(12,2),
    "monthOverMonthGrowth" DOUBLE PRECISION,
    "repeatCustomerRate" DOUBLE PRECISION,
    "bestPerformingProductId" TEXT,
    "bestPerformingProductRevenue" DECIMAL(12,2),
    "bestPerformingProductUnitsSold" INTEGER,
    "pendingCustomerQuestions" INTEGER,
    "lowConversionProductCount" INTEGER,
    "profitabilityScore" INTEGER,
    "averageRating" DOUBLE PRECISION,
    "responseRate" DOUBLE PRECISION,
    "averageDeliveryTime" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_SellerMetrics_pkey" PRIMARY KEY ("sellerId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "analytics_seller_daily_sales" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_seller_daily_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "analytics_seller_product_performance" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL,
    "conversionRate" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_seller_product_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "analytics_seller_inventory_health" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "stockStatus" TEXT NOT NULL,
    "salesVelocity" DOUBLE PRECISION,
    "daysUntilStockout" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_seller_inventory_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "analytics_seller_action_items" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productId" TEXT,
    "metadata" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_seller_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_SalesAnalytics" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "insights" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_SalesAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_SupplierAnalytics" (
    "supplierId" TEXT NOT NULL,
    "resourceUtilization" JSONB,
    "lastUpdated" TIMESTAMP(3),
    "qualityScore" DOUBLE PRECISION,
    "certificatesIssued" INTEGER DEFAULT 0,
    "ordersShipped" INTEGER DEFAULT 0,
    "lastShipment" TIMESTAMP(3),
    "totalRevenue" DOUBLE PRECISION DEFAULT 0.0,
    "paymentsReceived" INTEGER DEFAULT 0,
    "pricingUpdates" INTEGER DEFAULT 0,
    "activeProducts" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_SupplierAnalytics_pkey" PRIMARY KEY ("supplierId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_CourierAnalytics" (
    "courierId" TEXT NOT NULL,
    "performanceScore" DOUBLE PRECISION,
    "lastAnalysis" TIMESTAMP(3),
    "totalEarnings" DOUBLE PRECISION DEFAULT 0.0,
    "deliveriesCompleted" INTEGER DEFAULT 0,
    "lastDelivery" TIMESTAMP(3),
    "totalPayouts" DOUBLE PRECISION DEFAULT 0.0,
    "payoutsReceived" INTEGER DEFAULT 0,
    "vehicleStatus" TEXT,
    "lastVehicleUpdate" TIMESTAMP(3),
    "kycStatus" TEXT,
    "kycCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_CourierAnalytics_pkey" PRIMARY KEY ("courierId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_Metric" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dimension" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Analytics_Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Auth_UserRole" NOT NULL DEFAULT 'buyer',
    "status" "Auth_UserStatus" NOT NULL DEFAULT 'pending_verification',
    "phoneNumber" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_user_sync" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Auth_UserRole" NOT NULL DEFAULT 'buyer',
    "status" "Auth_UserStatus" NOT NULL DEFAULT 'pending_verification',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_user_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_two_factor_auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "deviceName" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_user_indexes" (
    "userId" TEXT NOT NULL,
    "indexType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businessregistry_businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" "BusinessRegistry_BusinessType" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "taxId" TEXT,
    "status" "BusinessRegistry_BusinessStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "BusinessRegistry_VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "complianceStatus" "BusinessRegistry_ComplianceStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "ownerId" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessregistry_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businessregistry_business_addresses" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BusinessRegistry_AddressType" NOT NULL DEFAULT 'MAIN',
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Tanzania',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businessregistry_business_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businessregistry_business_documents" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BusinessRegistry_DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "BusinessRegistry_DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "businessregistry_business_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businessregistry_compliance_records" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BusinessRegistry_ComplianceType" NOT NULL,
    "status" "BusinessRegistry_ComplianceStatus" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "businessregistry_compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "businessregistry_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "businessregistry_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_store" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_categories" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(500),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seoMetadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_products" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "status" "Catalog_ProductStatus" NOT NULL DEFAULT 'draft',
    "visibility" "Catalog_Visibility" NOT NULL DEFAULT 'public',
    "seoMetadata" JSONB,
    "tags" TEXT[],
    "gtin" VARCHAR(14),
    "mpn" VARCHAR(100),
    "isbn" VARCHAR(13),
    "fingerprint" VARCHAR(64),
    "fingerprintVersion" INTEGER NOT NULL DEFAULT 1,
    "slug" VARCHAR(300) NOT NULL,
    "seoTitle" VARCHAR(160),
    "shortSeoDescription" VARCHAR(160),
    "generatedDescription" TEXT,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_buy_boxes" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "primarySellerId" UUID NOT NULL,
    "primaryScore" DECIMAL(6,2) NOT NULL,
    "lastComputedAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_buy_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_buy_box_alternatives" (
    "id" UUID NOT NULL,
    "buyBoxId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "catalog_buy_box_alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255),
    "price" DECIMAL(10,2) NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "inventoryPolicy" "Catalog_InventoryPolicy" NOT NULL DEFAULT 'deny',
    "weight" DECIMAL(8,3),
    "dimensions" JSONB,
    "attributes" JSONB,
    "images" JSONB,
    "status" "Catalog_VariantStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_media_refs" (
    "id" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "mediaType" VARCHAR(50) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "altText" VARCHAR(255),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_media_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_product_match_audits" (
    "id" UUID NOT NULL,
    "candidateProductId" UUID NOT NULL,
    "matchedProductId" UUID,
    "matchLevel" "Catalog_MatchLevel" NOT NULL,
    "matchScore" DECIMAL(5,2) NOT NULL,
    "matchingCriteria" JSONB NOT NULL,
    "decision" "Catalog_MatchDecision" NOT NULL,
    "decidedBy" "Catalog_MatchDecidedBy" NOT NULL,
    "sellerId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_match_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_match_confirmations" (
    "id" UUID NOT NULL,
    "auditId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "candidateProducts" JSONB NOT NULL,
    "status" "Catalog_ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "sellerChoice" TEXT,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "respondedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_match_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_category_attributes" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "displayLabel" VARCHAR(150) NOT NULL,
    "type" "Catalog_AttributeType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "placeholder" VARCHAR(200),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_product_attributes" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "catalog_outbox_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(6),

    CONSTRAINT "catalog_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_Cart" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '7 days'::interval),

    CONSTRAINT "Checkout_Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "priceAtTime" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_CheckoutSession" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "shippingAddressId" TEXT,
    "billingAddressId" TEXT,
    "shippingMethodId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethodId" TEXT,
    "paymentStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '01:00:00'::interval),

    CONSTRAINT "Checkout_CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_Order" (
    "id" TEXT NOT NULL,
    "checkoutSessionId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shippingAddressId" TEXT,
    "billingAddressId" TEXT,
    "shippingMethodId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethodId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "trackingNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkout_OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_InventoryReservation" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checkout_AppliedDiscount" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "discountCode" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkout_AppliedDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_commissions" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "type" "Commission_CommissionType" NOT NULL,
    "status" "Commission_CommissionStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(6),
    "payoutId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_referrals" (
    "id" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "refereeId" UUID NOT NULL,
    "referralCode" VARCHAR(50) NOT NULL,
    "status" "Commission_ReferralStatus" NOT NULL DEFAULT 'pending',
    "rewardAmount" DECIMAL(8,2),
    "rewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_rewards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "Commission_RewardType" NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "description" TEXT,
    "status" "Commission_RewardStatus" NOT NULL DEFAULT 'earned',
    "expiresAt" TIMESTAMP(6),
    "redeemedAt" TIMESTAMP(6),
    "referenceId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_payouts" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "recipientType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "Commission_PayoutStatus" NOT NULL DEFAULT 'pending',
    "scheduledDate" TIMESTAMP(6),
    "processedDate" TIMESTAMP(6),
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_event_store" (
    "id" UUID NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_event_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_posts" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT NOT NULL,
    "type" "Community_PostType" NOT NULL DEFAULT 'text',
    "visibility" "Community_Visibility" NOT NULL DEFAULT 'public',
    "tags" TEXT[],
    "location" JSONB,
    "metadata" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "status" "Community_PostStatus" NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(6),
    "moderatedBy" UUID,
    "moderatedAt" TIMESTAMP(6),
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "avatarUrl" VARCHAR(500),
    "bio" VARCHAR(500),
    "location" VARCHAR(100),
    "website" VARCHAR(255),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "Community_UserStatus" NOT NULL DEFAULT 'active',
    "lastActiveAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "community_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_comments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "parentId" UUID,
    "content" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "repliesCount" INTEGER NOT NULL DEFAULT 0,
    "status" "Community_CommentStatus" NOT NULL DEFAULT 'published',
    "moderatedBy" UUID,
    "moderatedAt" TIMESTAMP(6),
    "moderationReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_likes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "postId" UUID,
    "commentId" UUID,
    "type" "Community_LikeType" NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_shares" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "platform" VARCHAR(50),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_follows" (
    "id" UUID NOT NULL,
    "followerId" UUID NOT NULL,
    "followingId" UUID NOT NULL,
    "status" "Community_FollowStatus" NOT NULL DEFAULT 'accepted',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_reports" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "reason" "Community_ReportReason" NOT NULL,
    "description" VARCHAR(1000),
    "status" "Community_ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_hashtags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "trendingScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_bookmarks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_subject_rights_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" "Compliance_SubjectRightsRequestType" NOT NULL,
    "status" "Compliance_SubjectRightsRequestStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "data" JSONB,
    "reason" TEXT,

    CONSTRAINT "compliance_subject_rights_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_tcra_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "registrationAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "lastAuditAt" TIMESTAMP(3),
    "auditFindings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tcra_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_tra_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tin" TEXT NOT NULL,
    "vrn" TEXT,
    "taxComplianceStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastFiscalCheck" TIMESTAMP(3),
    "efdStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_tra_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_aml_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sanctionsStatus" TEXT NOT NULL DEFAULT 'clear',
    "pepStatus" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_aml_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_market_records" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "ethicalScore" DOUBLE PRECISION,
    "qualityStatus" TEXT NOT NULL DEFAULT 'pending',
    "certifications" JSONB,
    "lastAuditAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_market_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_data_retention_policies" (
    "id" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "retentionPeriod" INTEGER NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "applicableLaw" TEXT NOT NULL,
    "autoDelete" BOOLEAN NOT NULL DEFAULT true,
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_data_deletion_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "recordsDeleted" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "compliance_data_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_kyc_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationStatus" "Compliance_KYCStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "documents" JSONB,
    "rejectionReason" TEXT,
    "expiryDate" TIMESTAMP(3),
    "riskLevel" "Compliance_KYCRiskLevel" NOT NULL DEFAULT 'medium',

    CONSTRAINT "compliance_kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,

    CONSTRAINT "compliance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_data_processing_records" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "recipients" JSONB NOT NULL,
    "retentionPeriod" TEXT NOT NULL,
    "securityMeasures" JSONB NOT NULL,
    "lastReviewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_data_processing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_privacy_impact_assessments" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessor" TEXT NOT NULL,
    "riskLevel" "Compliance_RiskLevel" NOT NULL,
    "findings" JSONB,
    "recommendations" JSONB,
    "status" "Compliance_AssessmentStatus" NOT NULL DEFAULT 'in_progress',

    CONSTRAINT "compliance_privacy_impact_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_warehouses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" JSONB NOT NULL,
    "type" "Inventory_WarehouseType" NOT NULL,
    "status" "Inventory_WarehouseStatus" NOT NULL DEFAULT 'active',
    "capacity" JSONB,
    "operatingHours" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "inventory_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_stock_items" (
    "id" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "quantityOnOrder" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "unitCost" DECIMAL(10,2),
    "lastInventoryCount" TIMESTAMP(6),
    "expiryDate" DATE,
    "batchNumber" VARCHAR(100),
    "locationCode" VARCHAR(50),
    "status" "Inventory_StockStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_reservations" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "quantityReserved" INTEGER NOT NULL,
    "status" "Inventory_ReservationStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "fulfilledAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "movementType" "Inventory_MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" UUID,
    "reason" VARCHAR(255),
    "performedBy" UUID,
    "unitCost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_counts" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productVariantId" UUID,
    "countedBy" UUID NOT NULL,
    "countedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Inventory_CountStatus" NOT NULL DEFAULT 'in_progress',
    "countType" "Inventory_CountType" NOT NULL DEFAULT 'full',
    "itemsCounted" INTEGER NOT NULL DEFAULT 0,
    "discrepanciesFound" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completedAt" TIMESTAMP(6),
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_count_items" (
    "id" UUID NOT NULL,
    "inventoryCountId" UUID NOT NULL,
    "productVariantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER NOT NULL,
    "discrepancy" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "inventory_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "inventory_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logistics_couriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "vehicleType" TEXT NOT NULL,
    "vehicleLicensePlate" TEXT NOT NULL,
    "vehicleCapacity" DOUBLE PRECISION NOT NULL,
    "vehicleFuelType" TEXT NOT NULL,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "locationAccuracy" DOUBLE PRECISION,
    "locationTimestamp" TIMESTAMP(3),
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDeliveryTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_couriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logistics_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trackingNumber" TEXT,
    "pickupStreet" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupRegion" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "deliveryStreet" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryRegion" TEXT NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION NOT NULL,
    "deliveryLongitude" DOUBLE PRECISION NOT NULL,
    "deliveryContactName" TEXT NOT NULL,
    "deliveryContactPhone" TEXT NOT NULL,
    "packageWeight" DOUBLE PRECISION NOT NULL,
    "packageValue" DOUBLE PRECISION NOT NULL,
    "packageFragile" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDeliveryTime" TIMESTAMP(3),
    "actualDeliveryTime" TIMESTAMP(3),
    "isCOD" BOOLEAN NOT NULL DEFAULT false,
    "codAmount" DECIMAL(65,30),
    "codCurrency" TEXT,
    "codCollected" BOOLEAN NOT NULL DEFAULT false,
    "codCollectedAt" TIMESTAMP(3),
    "codOtpVerified" BOOLEAN NOT NULL DEFAULT false,
    "codProofGpsLat" DOUBLE PRECISION,
    "codProofGpsLng" DOUBLE PRECISION,
    "codProofTimestamp" TIMESTAMP(3),
    "buyerId" TEXT,
    "sellerId" TEXT,
    "codCommitmentHoldId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logistics_location_history" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_location_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logistics_earnings" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "baseEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "logistics_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "logistics_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "Notification_NotificationType" NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "status" "Notification_TemplateStatus" NOT NULL DEFAULT 'active',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "templateId" UUID,
    "type" "Notification_NotificationType" NOT NULL,
    "priority" "Notification_NotificationPriority" NOT NULL DEFAULT 'normal',
    "subject" VARCHAR(255),
    "content" TEXT,
    "data" JSONB,
    "status" "Notification_NotificationStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(6),
    "sentAt" TIMESTAMP(6),
    "deliveredAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "providerMessageId" VARCHAR(255),
    "status" "Notification_DeliveryStatus" NOT NULL,
    "statusCode" VARCHAR(10),
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "deliveryCost" DECIMAL(6,4),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "Order_OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "Order_PaymentMethod" NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "codCommitmentFee" DECIMAL(65,30),
    "codCommitmentPaid" BOOLEAN NOT NULL DEFAULT false,
    "codReputationScore" INTEGER,
    "codEligibilityChecked" BOOLEAN NOT NULL DEFAULT false,
    "codDeliveryOtp" TEXT,
    "codOtpExpiresAt" TIMESTAMP(3),
    "codDeliveryConfirmedAt" TIMESTAMP(3),
    "codDeliveryConfirmedBy" TEXT,
    "codProofGpsLat" DOUBLE PRECISION,
    "codProofGpsLng" DOUBLE PRECISION,
    "codProofTimestamp" TIMESTAMP(3),
    "codCommitmentHoldId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_cod_disputes" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "disputeType" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_cod_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "method" "Order_PaymentMethod" NOT NULL,
    "status" "Order_PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "externalRef" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_settlements" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "sellerPayout" DECIMAL(65,30) NOT NULL,
    "platformCommission" DECIMAL(65,30) NOT NULL,
    "courierEarnings" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "status" "Order_SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "order_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_saga_logs" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "currentStep" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_saga_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order_saga_step_logs" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "order_saga_step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "method" "Payment_PaymentMethod" NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "providerRef" VARCHAR(255),
    "status" "Payment_PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(500),
    "metadata" JSONB,
    "processedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "reason" VARCHAR(255) NOT NULL,
    "reasonDetails" TEXT,
    "status" "Payment_RefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" VARCHAR(255),
    "processedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "eventId" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(6),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_outbox_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(6),

    CONSTRAINT "payment_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_fraud_assessments" (
    "id" UUID NOT NULL,
    "transactionId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "flags" JSONB NOT NULL,
    "processingTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "payment_fraud_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payout_payouts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userRole" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "method" "Payout_PayoutMethod" NOT NULL,
    "status" "Payout_PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankDetails" JSONB,
    "mobileMoneyDetails" JSONB,
    "reference" VARCHAR(255),
    "processedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "fee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "payout_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payout_outbox_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(6),

    CONSTRAINT "payout_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training_TrainingRecord" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "learnerRole" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "progress" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training_CertificationRequirement" (
    "module" TEXT NOT NULL,
    "minimumScore" INTEGER NOT NULL,
    "validityPeriodDays" INTEGER NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_CertificationRequirement_pkey" PRIMARY KEY ("module")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training_TrainingModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" "Training_ContentType" NOT NULL DEFAULT 'TEXT',
    "content" JSONB NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "prerequisites" TEXT[],
    "targetRoles" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" "Training_DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training_Badge" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training_LeaderboardEntry" (
    "learnerId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "modulesCount" INTEGER NOT NULL DEFAULT 0,
    "badgesCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_LeaderboardEntry_pkey" PRIMARY KEY ("learnerId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "User_UserRole" NOT NULL DEFAULT 'buyer',
    "status" "User_UserStatus" NOT NULL DEFAULT 'pending_verification',
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "avatar" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "codReputationScore" INTEGER NOT NULL DEFAULT 0,
    "codSuccessfulOrders" INTEGER NOT NULL DEFAULT 0,
    "codFailedOrders" INTEGER NOT NULL DEFAULT 0,
    "codTotalOrders" INTEGER NOT NULL DEFAULT 0,
    "codLastOrderAt" TIMESTAMP(3),
    "codSuspendedUntil" TIMESTAMP(3),
    "codPermanentlyDisabled" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_cod_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reputationChange" INTEGER NOT NULL,
    "reputationAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cod_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "User_AddressType" NOT NULL DEFAULT 'home',
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_service_user_indexes" (
    "userId" TEXT NOT NULL,
    "indexType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "user_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "status" "Wallet_WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozenAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "codCommitmentLimit" DECIMAL(10,2) NOT NULL DEFAULT 500000,
    "codCommitmentUsed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "codCommitmentCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "Wallet_TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "frozenAmountBefore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "frozenAmountAfter" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "referenceType" VARCHAR(50),
    "referenceId" UUID,
    "description" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" UUID,
    "idempotencyKey" TEXT,
    "initiatedBy" TEXT,
    "initiatedByType" TEXT,
    "reason" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversalTransactionId" UUID,
    "expiresAt" TIMESTAMP(6),
    "isCODRelated" BOOLEAN NOT NULL DEFAULT false,
    "codOrderId" TEXT,
    "codConfirmationRequired" BOOLEAN NOT NULL DEFAULT false,
    "codConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_holds" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TZS',
    "reason" VARCHAR(255) NOT NULL,
    "status" "Wallet_HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "isCaptured" BOOLEAN NOT NULL DEFAULT false,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "wallet_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_idempotency_records" (
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '24:00:00'::interval),

    CONSTRAINT "wallet_idempotency_records_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_audit_logs" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_outbox_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(6),

    CONSTRAINT "wallet_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "Support_TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Support_TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "Support_SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_ticket_status_history" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "Support_TicketStatus" NOT NULL,
    "toStatus" "Support_TicketStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specializations" TEXT[],
    "maxConcurrentTickets" INTEGER NOT NULL DEFAULT 5,
    "currentTicketCount" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "totalTicketsResolved" INTEGER NOT NULL DEFAULT 0,
    "averageResolutionTime" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shared_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "shared_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "global_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "global_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "support_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    "contactEmail" VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(50),
    "businessDescription" TEXT,
    "status" "enabler_status" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verifiedAt" TIMESTAMP(6),
    "verifiedBy" UUID,
    "tier" "enabler_tier" NOT NULL DEFAULT 'BRONZE',
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "customerRating" DECIMAL(3,2),
    "totalCommissionEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "businessAddress" TEXT,
    "taxId" VARCHAR(100),
    "bankAccountDetails" JSONB,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_product_listings" (
    "id" UUID NOT NULL,
    "enablerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "enabler_listing_status" NOT NULL DEFAULT 'ACTIVE',
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "customPrice" DECIMAL(10,2),
    "priceMarkup" DECIMAL(5,4),
    "listingTerms" JSONB,
    "sellerApproved" BOOLEAN NOT NULL DEFAULT false,
    "sellerApprovedAt" TIMESTAMP(6),
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "expiresAt" TIMESTAMP(6),

    CONSTRAINT "enabler_product_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_orders" (
    "id" UUID NOT NULL,
    "enablerId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "productListingId" UUID NOT NULL,
    "status" "enabler_order_status" NOT NULL DEFAULT 'PENDING',
    "orderAmount" DECIMAL(12,2) NOT NULL,
    "productAmount" DECIMAL(12,2) NOT NULL,
    "enablerCommission" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "tierBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "performanceBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellerPaidAt" TIMESTAMP(6),
    "enablerPaidAt" TIMESTAMP(6),
    "settlementStatus" TEXT NOT NULL DEFAULT 'pending',
    "cancelledAt" TIMESTAMP(6),
    "cancellationReason" TEXT,
    "disputeStatus" TEXT DEFAULT 'none',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_commissions" (
    "id" UUID NOT NULL,
    "enablerId" UUID NOT NULL,
    "enablerOrderId" UUID NOT NULL,
    "commissionId" UUID,
    "baseCommission" DECIMAL(12,2) NOT NULL,
    "tierBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "performanceBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "holdUntil" TIMESTAMP(6),
    "protectionStatus" TEXT NOT NULL DEFAULT 'active',
    "fraudCheckStatus" TEXT NOT NULL DEFAULT 'pending',
    "payoutId" UUID,
    "paidAt" TIMESTAMP(6),
    "paymentMethod" TEXT,
    "calculationDetails" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_policies" (
    "id" UUID NOT NULL,
    "enablerId" UUID,
    "policyType" VARCHAR(100) NOT NULL,
    "policyName" VARCHAR(255) NOT NULL,
    "policyRules" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "sellerIds" TEXT[],
    "categoryIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(6),
    "createdBy" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_analytics" (
    "id" UUID NOT NULL,
    "enablerId" UUID NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "customerRating" DECIMAL(3,2),
    "responseTime" INTEGER,
    "totalCommissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingCommissions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "repeatCustomers" INTEGER NOT NULL DEFAULT 0,
    "customerRetention" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "disputeRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "cancellationRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "fraudScore" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "lastSaleAt" TIMESTAMP(6),
    "lastActivityAt" TIMESTAMP(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enabler_outbox_events" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(6),

    CONSTRAINT "enabler_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "Campaign_Type" NOT NULL,
    "status" "Campaign_Status" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "autoApply" BOOLEAN NOT NULL DEFAULT true,
    "autoRevert" BOOLEAN NOT NULL DEFAULT true,
    "sellerId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_pricing_rules" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ruleType" "Campaign_RuleType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_conditions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "Campaign_ConditionType" NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_products" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "originalPrice" JSONB NOT NULL,
    "campaignPrice" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_categories" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalProductsAffected" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueImpact" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "averageDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaign_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "campaign_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_discussion_threads" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "Community_ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "expertiseLevel" "Community_ExpertiseLevel" NOT NULL,
    "businessContext" JSONB NOT NULL,
    "maxResponsesPerUser" INTEGER NOT NULL DEFAULT 3,
    "acceptedAnswerId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_discussion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_thread_answers" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_thread_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "expertiseAreas" JSONB NOT NULL,
    "industryExperience" TEXT[],
    "certifications" TEXT[],
    "contributionScore" INTEGER NOT NULL DEFAULT 0,
    "contributionMetrics" JSONB NOT NULL,
    "reputationTier" "Community_ReputationTier" NOT NULL DEFAULT 'NEWCOMER',
    "businessGoals" JSONB NOT NULL,
    "learningObjectives" JSONB NOT NULL,
    "availableForMentorship" BOOLEAN NOT NULL DEFAULT false,
    "mentorshipCapacity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_knowledge_articles" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "industryTags" TEXT[],
    "expertiseLevel" "Community_ExpertiseLevel" NOT NULL,
    "reviewStatus" "Community_ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "trainingModuleId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_article_reviews" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_article_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_business_challenges" (
    "id" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "industryTags" TEXT[],
    "constraints" TEXT[],
    "successCriteria" JSONB NOT NULL,
    "status" "Community_ChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3),
    "acceptedSolutionId" TEXT,
    "collaborators" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "solvedAt" TIMESTAMP(3),

    CONSTRAINT "community_business_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_challenge_solutions" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "implementation" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_challenge_solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_engagement_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quotaType" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL,
    "weeklyLimit" INTEGER NOT NULL,
    "dailyUsed" INTEGER NOT NULL DEFAULT 0,
    "weeklyUsed" INTEGER NOT NULL DEFAULT 0,
    "dailyRemaining" INTEGER NOT NULL,
    "weeklyRemaining" INTEGER NOT NULL,
    "lastResetDaily" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResetWeekly" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_engagement_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_contribution_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_contribution_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_user_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_peer_endorsements" (
    "id" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "endorseeId" TEXT NOT NULL,
    "expertiseArea" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_peer_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "community_outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "community_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saga_logs" (
    "sagaId" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saga_logs_pkey" PRIMARY KEY ("sagaId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saga_step_logs" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "saga_step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saga_dead_letters" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "lastError" TEXT NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "saga_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "event_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sms_messages" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "Sms_Status" NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "providerMessageId" TEXT,
    "userId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_seller_daily_sales_sellerId_date_idx" ON "analytics_seller_daily_sales"("sellerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_seller_daily_sales_sellerId_date_key" ON "analytics_seller_daily_sales"("sellerId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_seller_product_performance_sellerId_revenue_idx" ON "analytics_seller_product_performance"("sellerId", "revenue");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_seller_product_performance_sellerId_productId_key" ON "analytics_seller_product_performance"("sellerId", "productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_seller_inventory_health_sellerId_stockStatus_idx" ON "analytics_seller_inventory_health"("sellerId", "stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_seller_inventory_health_sellerId_productId_key" ON "analytics_seller_inventory_health"("sellerId", "productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_seller_action_items_sellerId_isResolved_priority_idx" ON "analytics_seller_action_items"("sellerId", "isResolved", "priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analytics_Metric_metricType_timestamp_idx" ON "Analytics_Metric"("metricType", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analytics_Metric_dimension_metricType_idx" ON "Analytics_Metric"("dimension", "metricType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analytics_Event_status_timestamp_idx" ON "Analytics_Event"("status", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analytics_Event_type_timestamp_idx" ON "Analytics_Event"("type", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_sync_email_key" ON "auth_user_sync"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_two_factor_auth_userId_key" ON "user_two_factor_auth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_password_reset_tokens_token_key" ON "auth_password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_email_verification_tokens_token_key" ON "auth_email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auth_audit_logs_userId_idx" ON "auth_audit_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auth_audit_logs_timestamp_idx" ON "auth_audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_indexes_userId_indexType_key" ON "auth_user_indexes"("userId", "indexType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "businessregistry_businesses_registrationNumber_key" ON "businessregistry_businesses"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "businessregistry_businesses_taxId_key" ON "businessregistry_businesses"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "businessregistry_outbox_events_eventId_key" ON "businessregistry_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "businessregistry_outbox_events_status_nextRetryAt_idx" ON "businessregistry_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "businessregistry_outbox_events_createdAt_idx" ON "businessregistry_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "event_store_eventId_key" ON "event_store"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_store_aggregateId_idx" ON "event_store"("aggregateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_store_eventType_idx" ON "event_store"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_categories_slug_key" ON "catalog_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_slug_key" ON "catalog_products"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_gtin_idx" ON "catalog_products"("gtin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_mpn_idx" ON "catalog_products"("mpn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_isbn_idx" ON "catalog_products"("isbn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_brand_model_categoryId_idx" ON "catalog_products"("brand", "model", "categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_products_slug_idx" ON "catalog_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_categoryId_fingerprint_key" ON "catalog_products"("categoryId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_buy_boxes_productId_key" ON "catalog_buy_boxes"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_buy_boxes_productId_idx" ON "catalog_buy_boxes"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_buy_box_alternatives_buyBoxId_idx" ON "catalog_buy_box_alternatives"("buyBoxId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_product_variants_sku_key" ON "catalog_product_variants"("sku");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_variants_productId_idx" ON "catalog_product_variants"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_variants_status_idx" ON "catalog_product_variants"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_match_audits_sellerId_createdAt_idx" ON "catalog_product_match_audits"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_match_audits_matchLevel_idx" ON "catalog_product_match_audits"("matchLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_match_audits_decision_idx" ON "catalog_product_match_audits"("decision");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_match_confirmations_sellerId_status_idx" ON "catalog_match_confirmations"("sellerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_match_confirmations_expiresAt_idx" ON "catalog_match_confirmations"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_category_attributes_categoryId_idx" ON "catalog_category_attributes"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_attributes_productId_idx" ON "catalog_product_attributes"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_product_attributes_attributeId_idx" ON "catalog_product_attributes"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_outbox_events_eventId_key" ON "catalog_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_outbox_events_status_nextRetryAt_idx" ON "catalog_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_outbox_events_createdAt_idx" ON "catalog_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Cart_userId_idx" ON "Checkout_Cart"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Cart_status_idx" ON "Checkout_Cart"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Cart_expiresAt_idx" ON "Checkout_Cart"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_CartItem_cartId_idx" ON "Checkout_CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Checkout_CartItem_cartId_productId_variantId_key" ON "Checkout_CartItem"("cartId", "productId", "variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_CheckoutSession_userId_idx" ON "Checkout_CheckoutSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_CheckoutSession_status_idx" ON "Checkout_CheckoutSession"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_CheckoutSession_cartId_idx" ON "Checkout_CheckoutSession"("cartId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_CheckoutSession_expiresAt_idx" ON "Checkout_CheckoutSession"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Order_userId_idx" ON "Checkout_Order"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Order_status_idx" ON "Checkout_Order"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Order_paymentStatus_idx" ON "Checkout_Order"("paymentStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_Order_createdAt_idx" ON "Checkout_Order"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_OrderItem_orderId_idx" ON "Checkout_OrderItem"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_InventoryReservation_checkoutId_idx" ON "Checkout_InventoryReservation"("checkoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_InventoryReservation_status_idx" ON "Checkout_InventoryReservation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_InventoryReservation_expiresAt_idx" ON "Checkout_InventoryReservation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Checkout_InventoryReservation_checkoutId_productId_variantI_key" ON "Checkout_InventoryReservation"("checkoutId", "productId", "variantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_AppliedDiscount_checkoutId_idx" ON "Checkout_AppliedDiscount"("checkoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Checkout_AppliedDiscount_discountCode_idx" ON "Checkout_AppliedDiscount"("discountCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "commission_referrals_referralCode_key" ON "commission_referrals"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_users_username_key" ON "community_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_likes_userId_postId_key" ON "community_likes"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_likes_userId_commentId_key" ON "community_likes"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_shares_userId_postId_key" ON "community_shares"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_follows_followerId_followingId_key" ON "community_follows"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_hashtags_name_key" ON "community_hashtags"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_bookmarks_userId_postId_key" ON "community_bookmarks"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_tra_records_tin_key" ON "compliance_tra_records"("tin");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_aml_records_userId_key" ON "compliance_aml_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_warehouses_code_key" ON "inventory_warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stock_items_sku_key" ON "inventory_stock_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stock_items_productVariantId_warehouseId_key" ON "inventory_stock_items"("productVariantId", "warehouseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservations_orderId_idx" ON "inventory_reservations"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservations_status_idx" ON "inventory_reservations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservations_expiresAt_idx" ON "inventory_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservations_productVariantId_status_idx" ON "inventory_reservations"("productVariantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_movements_productVariantId_warehouseId_idx" ON "inventory_movements"("productVariantId", "warehouseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_outbox_events_eventId_key" ON "inventory_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_outbox_events_status_nextRetryAt_idx" ON "inventory_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_outbox_events_createdAt_idx" ON "inventory_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "logistics_couriers_phone_key" ON "logistics_couriers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "logistics_couriers_email_key" ON "logistics_couriers"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "logistics_deliveries_trackingNumber_key" ON "logistics_deliveries"("trackingNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_deliveries_orderId_idx" ON "logistics_deliveries"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_deliveries_courierId_idx" ON "logistics_deliveries"("courierId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_deliveries_status_idx" ON "logistics_deliveries"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_deliveries_createdAt_idx" ON "logistics_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_location_history_courierId_timestamp_idx" ON "logistics_location_history"("courierId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_earnings_courierId_date_idx" ON "logistics_earnings"("courierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "logistics_outbox_events_eventId_key" ON "logistics_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_outbox_events_status_nextRetryAt_idx" ON "logistics_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "logistics_outbox_events_createdAt_idx" ON "logistics_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_notifications_userId_idx" ON "notification_notifications"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_notifications_status_idx" ON "notification_notifications"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_notifications_userId_status_idx" ON "notification_notifications"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_cod_disputes_orderId_idx" ON "order_cod_disputes"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_cod_disputes_status_idx" ON "order_cod_disputes"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_payments_orderId_idx" ON "order_payments"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_payments_status_idx" ON "order_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_settlements_settlementId_key" ON "order_settlements"("settlementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_settlements_orderId_idx" ON "order_settlements"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_settlements_status_idx" ON "order_settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_outbox_events_eventId_key" ON "order_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_outbox_events_status_nextRetryAt_idx" ON "order_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_outbox_events_createdAt_idx" ON "order_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_saga_logs_sagaId_key" ON "order_saga_logs"("sagaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_saga_logs_status_idx" ON "order_saga_logs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_saga_logs_sagaType_idx" ON "order_saga_logs"("sagaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_saga_step_logs_sagaId_idx" ON "order_saga_step_logs"("sagaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_paymentId_idx" ON "payment_refunds"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_orderId_idx" ON "payment_refunds"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_userId_idx" ON "payment_refunds"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_status_idx" ON "payment_refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_eventId_key" ON "payment_webhook_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_outbox_events_eventId_key" ON "payment_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_outbox_events_status_nextRetryAt_idx" ON "payment_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_outbox_events_createdAt_idx" ON "payment_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_fraud_assessments_transactionId_key" ON "payment_fraud_assessments"("transactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payout_payouts_userId_idx" ON "payout_payouts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payout_outbox_events_eventId_key" ON "payout_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payout_outbox_events_status_nextRetryAt_idx" ON "payout_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payout_outbox_events_createdAt_idx" ON "payout_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_TrainingRecord_learnerId_idx" ON "Training_TrainingRecord"("learnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_TrainingRecord_learnerRole_idx" ON "Training_TrainingRecord"("learnerRole");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_TrainingRecord_moduleId_idx" ON "Training_TrainingRecord"("moduleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_TrainingRecord_status_idx" ON "Training_TrainingRecord"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_TrainingRecord_expiresAt_idx" ON "Training_TrainingRecord"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_Badge_learnerId_idx" ON "Training_Badge"("learnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_Badge_type_idx" ON "Training_Badge"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_LeaderboardEntry_totalScore_idx" ON "Training_LeaderboardEntry"("totalScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_cod_history_userId_createdAt_idx" ON "user_cod_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_password_reset_tokens_token_key" ON "user_password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_verification_tokens_token_key" ON "user_email_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_service_user_indexes_userId_indexType_key" ON "user_service_user_indexes"("userId", "indexType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_outbox_events_eventId_key" ON "user_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_outbox_events_status_nextRetryAt_idx" ON "user_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_outbox_events_createdAt_idx" ON "user_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallets_status_idx" ON "wallets"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_idempotencyKey_key" ON "wallet_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_transactions_userId_idx" ON "wallet_transactions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_holds_walletId_idx" ON "wallet_holds"("walletId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_holds_userId_idx" ON "wallet_holds"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_holds_status_idx" ON "wallet_holds"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_holds_expiresAt_idx" ON "wallet_holds"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_audit_logs_entityId_idx" ON "wallet_audit_logs"("entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_audit_logs_actorId_idx" ON "wallet_audit_logs"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_outbox_events_eventId_key" ON "wallet_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_outbox_events_status_nextRetryAt_idx" ON "wallet_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wallet_outbox_events_createdAt_idx" ON "wallet_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_assignedAgentId_idx" ON "support_tickets"("assignedAgentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_category_idx" ON "support_tickets"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_messages_ticketId_idx" ON "support_ticket_messages"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_messages_senderId_idx" ON "support_ticket_messages"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_messages_createdAt_idx" ON "support_ticket_messages"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_attachments_ticketId_idx" ON "support_ticket_attachments"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_attachments_messageId_idx" ON "support_ticket_attachments"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_status_history_ticketId_idx" ON "support_ticket_status_history"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_ticket_status_history_createdAt_idx" ON "support_ticket_status_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "support_agents_userId_key" ON "support_agents"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_agents_userId_idx" ON "support_agents"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_agents_isAvailable_idx" ON "support_agents"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shared_outbox_events_eventId_key" ON "shared_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shared_outbox_events_status_nextRetryAt_idx" ON "shared_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shared_outbox_events_createdAt_idx" ON "shared_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "global_outbox_events_eventId_key" ON "global_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_outbox_events_status_nextRetryAt_idx" ON "global_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "global_outbox_events_createdAt_idx" ON "global_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "support_outbox_events_eventId_key" ON "support_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_outbox_events_status_nextRetryAt_idx" ON "support_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "support_outbox_events_createdAt_idx" ON "support_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_profiles_userId_key" ON "enabler_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_profiles_userId_idx" ON "enabler_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_profiles_status_idx" ON "enabler_profiles"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_profiles_tier_idx" ON "enabler_profiles"("tier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_product_listings_enablerId_idx" ON "enabler_product_listings"("enablerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_product_listings_productId_idx" ON "enabler_product_listings"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_product_listings_sellerId_idx" ON "enabler_product_listings"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_product_listings_status_idx" ON "enabler_product_listings"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_product_listings_enablerId_productId_key" ON "enabler_product_listings"("enablerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_orders_orderId_key" ON "enabler_orders"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_enablerId_idx" ON "enabler_orders"("enablerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_orderId_idx" ON "enabler_orders"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_sellerId_idx" ON "enabler_orders"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_buyerId_idx" ON "enabler_orders"("buyerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_status_idx" ON "enabler_orders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_orders_settlementStatus_idx" ON "enabler_orders"("settlementStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_commissions_enablerOrderId_key" ON "enabler_commissions"("enablerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_commissions_commissionId_key" ON "enabler_commissions"("commissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_commissions_enablerId_idx" ON "enabler_commissions"("enablerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_commissions_status_idx" ON "enabler_commissions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_commissions_holdUntil_idx" ON "enabler_commissions"("holdUntil");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_commissions_paidAt_idx" ON "enabler_commissions"("paidAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_policies_enablerId_idx" ON "enabler_policies"("enablerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_policies_policyType_idx" ON "enabler_policies"("policyType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_policies_isGlobal_idx" ON "enabler_policies"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_analytics_enablerId_key" ON "enabler_analytics"("enablerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_analytics_enablerId_idx" ON "enabler_analytics"("enablerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_outbox_events_eventId_key" ON "enabler_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_outbox_events_status_nextRetryAt_idx" ON "enabler_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enabler_outbox_events_createdAt_idx" ON "enabler_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_sellerId_idx" ON "campaigns"("sellerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaigns_startDate_endDate_idx" ON "campaigns"("startDate", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_pricing_rules_campaignId_idx" ON "campaign_pricing_rules"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_conditions_campaignId_idx" ON "campaign_conditions"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_products_productId_idx" ON "campaign_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_products_campaignId_productId_key" ON "campaign_products"("campaignId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_categories_campaignId_categoryId_key" ON "campaign_categories"("campaignId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_metrics_campaignId_key" ON "campaign_metrics"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_outbox_events_eventId_key" ON "campaign_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_outbox_events_status_nextRetryAt_idx" ON "campaign_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campaign_outbox_events_createdAt_idx" ON "campaign_outbox_events"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_discussion_threads_authorId_idx" ON "community_discussion_threads"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_discussion_threads_category_status_idx" ON "community_discussion_threads"("category", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_discussion_threads_status_createdAt_idx" ON "community_discussion_threads"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_thread_answers_threadId_idx" ON "community_thread_answers"("threadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_thread_answers_authorId_idx" ON "community_thread_answers"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_thread_answers_isAccepted_idx" ON "community_thread_answers"("isAccepted");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_business_profiles_userId_key" ON "community_business_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_business_profiles_userId_idx" ON "community_business_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_business_profiles_reputationTier_idx" ON "community_business_profiles"("reputationTier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_knowledge_articles_authorId_idx" ON "community_knowledge_articles"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_knowledge_articles_category_reviewStatus_idx" ON "community_knowledge_articles"("category", "reviewStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_knowledge_articles_reviewStatus_publishedAt_idx" ON "community_knowledge_articles"("reviewStatus", "publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_article_reviews_articleId_idx" ON "community_article_reviews"("articleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_article_reviews_reviewerId_idx" ON "community_article_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_business_challenges_proposerId_idx" ON "community_business_challenges"("proposerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_business_challenges_category_status_idx" ON "community_business_challenges"("category", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_business_challenges_status_deadline_idx" ON "community_business_challenges"("status", "deadline");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_challenge_solutions_challengeId_idx" ON "community_challenge_solutions"("challengeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_challenge_solutions_authorId_idx" ON "community_challenge_solutions"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_engagement_quotas_userId_idx" ON "community_engagement_quotas"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_engagement_quotas_userId_quotaType_key" ON "community_engagement_quotas"("userId", "quotaType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_contribution_history_userId_createdAt_idx" ON "community_contribution_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_contribution_history_userId_actionType_idx" ON "community_contribution_history"("userId", "actionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_user_interactions_userId_timestamp_idx" ON "community_user_interactions"("userId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_user_interactions_contentId_interactionType_idx" ON "community_user_interactions"("contentId", "interactionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_peer_endorsements_endorseeId_expertiseArea_idx" ON "community_peer_endorsements"("endorseeId", "expertiseArea");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_peer_endorsements_endorserId_endorseeId_expertise_key" ON "community_peer_endorsements"("endorserId", "endorseeId", "expertiseArea");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "community_outbox_events_eventId_key" ON "community_outbox_events"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_outbox_events_status_nextRetryAt_idx" ON "community_outbox_events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "community_outbox_events_createdAt_idx" ON "community_outbox_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "saga_dead_letters_sagaId_key" ON "saga_dead_letters"("sagaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_logs_eventId_idx" ON "event_logs"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_logs_consumerName_idx" ON "event_logs"("consumerName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "event_logs_eventId_consumerName_key" ON "event_logs"("eventId", "consumerName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sms_messages_status_idx" ON "sms_messages"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sms_messages_phoneNumber_idx" ON "sms_messages"("phoneNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sms_messages_userId_idx" ON "sms_messages"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sms_messages_createdAt_idx" ON "sms_messages"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "analytics_seller_daily_sales" ADD CONSTRAINT "analytics_seller_daily_sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "analytics_seller_product_performance" ADD CONSTRAINT "analytics_seller_product_performance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "analytics_seller_inventory_health" ADD CONSTRAINT "analytics_seller_inventory_health_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "analytics_seller_action_items" ADD CONSTRAINT "analytics_seller_action_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_two_factor_auth" ADD CONSTRAINT "user_two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "auth_password_reset_tokens" ADD CONSTRAINT "auth_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "auth_email_verification_tokens" ADD CONSTRAINT "auth_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "businessregistry_business_addresses" ADD CONSTRAINT "businessregistry_business_addresses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "businessregistry_business_documents" ADD CONSTRAINT "businessregistry_business_documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "businessregistry_compliance_records" ADD CONSTRAINT "businessregistry_compliance_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_buy_box_alternatives" ADD CONSTRAINT "catalog_buy_box_alternatives_buyBoxId_fkey" FOREIGN KEY ("buyBoxId") REFERENCES "catalog_buy_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_product_variants" ADD CONSTRAINT "catalog_product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_category_attributes" ADD CONSTRAINT "catalog_category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "catalog_category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Checkout_CartItem" ADD CONSTRAINT "Checkout_CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Checkout_Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Checkout_OrderItem" ADD CONSTRAINT "Checkout_OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Checkout_Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "community_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_shares" ADD CONSTRAINT "community_shares_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_shares" ADD CONSTRAINT "community_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_stock_items" ADD CONSTRAINT "inventory_stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "logistics_deliveries" ADD CONSTRAINT "logistics_deliveries_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "logistics_location_history" ADD CONSTRAINT "logistics_location_history_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "logistics_earnings" ADD CONSTRAINT "logistics_earnings_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "notification_notifications" ADD CONSTRAINT "notification_notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "order_cod_disputes" ADD CONSTRAINT "order_cod_disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "order_settlements" ADD CONSTRAINT "order_settlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "order_saga_step_logs" ADD CONSTRAINT "order_saga_step_logs_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "order_saga_logs"("sagaId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Training_TrainingRecord" ADD CONSTRAINT "Training_TrainingRecord_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Training_TrainingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_cod_history" ADD CONSTRAINT "user_cod_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_password_reset_tokens" ADD CONSTRAINT "user_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_email_verification_tokens" ADD CONSTRAINT "user_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "wallet_holds" ADD CONSTRAINT "wallet_holds_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "support_ticket_status_history" ADD CONSTRAINT "support_ticket_status_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_product_listings" ADD CONSTRAINT "enabler_product_listings_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_orders" ADD CONSTRAINT "enabler_orders_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_commissions" ADD CONSTRAINT "enabler_commissions_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_commissions" ADD CONSTRAINT "enabler_commissions_enablerOrderId_fkey" FOREIGN KEY ("enablerOrderId") REFERENCES "enabler_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_policies" ADD CONSTRAINT "enabler_policies_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "enabler_analytics" ADD CONSTRAINT "enabler_analytics_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_pricing_rules" ADD CONSTRAINT "campaign_pricing_rules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_conditions" ADD CONSTRAINT "campaign_conditions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_categories" ADD CONSTRAINT "campaign_categories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_thread_answers" ADD CONSTRAINT "community_thread_answers_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "community_discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_article_reviews" ADD CONSTRAINT "community_article_reviews_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "community_knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "community_challenge_solutions" ADD CONSTRAINT "community_challenge_solutions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "community_business_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "saga_step_logs" ADD CONSTRAINT "saga_step_logs_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "saga_logs"("sagaId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

