-- Maysar Enabler capability (Enabler spec §4–§52)
--  1. Activation requirements (terms version/acceptance, training) + explicit
--     lifecycle timestamps on enabler_profiles (§5, §6).
--  2. Seller → Enabler authorization with a product/category allow-list (§7, §8, §9).
--  3. Permanent enabler entry link that stores NO permissions (§12, §13).
--  4. Attribution as a distinct concern from customer ownership (§11).
--  5. Enabler Order Builder draft + items — a proposal, NOT a cart, NOT an order
--     (§15–§20, §43, §44).
--  6. Single-use customer order link, persisted as a SHA-256 hash only (§21, §22).
--  7. Enabler earning anchored 1:1 to a real Maysar order for idempotency
--     (§29–§31, §39, §40).
--  8. Admin enforcement trail (§34, §52).
--
-- Prisma enum types must exist before the tables that reference them.

-- ── Lifecycle enum extension (§5) ───────────────────────────────────────────
ALTER TYPE "enabler_status" ADD VALUE IF NOT EXISTS 'RESTRICTED';
ALTER TYPE "enabler_status" ADD VALUE IF NOT EXISTS 'DEACTIVATED';

-- ── New enums ───────────────────────────────────────────────────────────────
CREATE TYPE "enabler_authorization_status" AS ENUM ('PENDING', 'APPROVED', 'REVOKED', 'SUSPENDED');
CREATE TYPE "enabler_scope_type" AS ENUM ('ALL_PRODUCTS', 'CATEGORY', 'PRODUCT');
CREATE TYPE "enabler_earning_rule_type" AS ENUM ('PERCENTAGE_OF_ITEM_SUBTOTAL', 'FIXED_PER_ORDER', 'FIXED_PER_ITEM');
CREATE TYPE "enabler_permanent_link_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "enabler_attribution_context" AS ENUM ('PERMANENT_LINK', 'PRODUCT_SHARE', 'ORDER_LINK');
CREATE TYPE "enabler_attribution_status" AS ENUM ('RECORDED', 'CONVERTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "enabler_draft_status" AS ENUM ('DRAFT', 'READY_FOR_CUSTOMER', 'CUSTOMER_OPENED', 'CUSTOMER_REVIEWING', 'ACCEPTED', 'CONVERTED', 'CANCELLED', 'EXPIRED', 'REJECTED');
CREATE TYPE "enabler_link_status" AS ENUM ('CREATED', 'OPENED', 'REVIEWING', 'ACCEPTED', 'CONSUMED', 'EXPIRED', 'REVOKED', 'CANCELLED');
CREATE TYPE "enabler_earning_status" AS ENUM ('ATTRIBUTED', 'PENDING', 'QUALIFIED', 'AVAILABLE', 'PAID', 'CANCELLED', 'REVERSED', 'DISPUTED', 'REJECTED');
CREATE TYPE "enabler_enforcement_type" AS ENUM ('RESTRICT', 'SUSPEND', 'REACTIVATE', 'DEACTIVATE');

-- ── enabler_profiles: activation requirements + lifecycle (§5, §6) ──────────
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "termsVersion" VARCHAR(32);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "trainingStatus" VARCHAR(32) NOT NULL DEFAULT 'not_started';
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "trainingCompletedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "restrictedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "restrictedReason" TEXT;
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(6);
ALTER TABLE "enabler_profiles" ADD COLUMN IF NOT EXISTS "deactivatedReason" TEXT;

CREATE INDEX IF NOT EXISTS "enabler_profiles_trainingStatus_idx" ON "enabler_profiles"("trainingStatus");

-- ── enabler_seller_authorizations (§7, §31) ─────────────────────────────────
-- Seller approval is scoped assistance ONLY: no inventory ownership, no pricing
-- authority, no payment custody. The earning rule below is seller-owned.
CREATE TABLE IF NOT EXISTS "enabler_seller_authorizations" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "status" "enabler_authorization_status" NOT NULL DEFAULT 'PENDING',
    "scopeType" "enabler_scope_type" NOT NULL DEFAULT 'ALL_PRODUCTS',
    "earningRuleType" "enabler_earning_rule_type" NOT NULL DEFAULT 'PERCENTAGE_OF_ITEM_SUBTOTAL',
    "earningRuleValue" DECIMAL(10,4) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
    "effectiveFrom" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(6),
    "approvedByUserId" VARCHAR(64),
    "approvedAt" TIMESTAMP(6),
    "revokedByUserId" VARCHAR(64),
    "revokedAt" TIMESTAMP(6),
    "revokedReason" TEXT,
    "suspendedAt" TIMESTAMP(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_seller_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_seller_authorizations_enablerId_sellerId_key" ON "enabler_seller_authorizations"("enablerId", "sellerId");
CREATE INDEX IF NOT EXISTS "enabler_seller_authorizations_enablerId_idx" ON "enabler_seller_authorizations"("enablerId");
CREATE INDEX IF NOT EXISTS "enabler_seller_authorizations_sellerId_idx" ON "enabler_seller_authorizations"("sellerId");
CREATE INDEX IF NOT EXISTS "enabler_seller_authorizations_status_idx" ON "enabler_seller_authorizations"("status");

ALTER TABLE "enabler_seller_authorizations"
    ADD CONSTRAINT "enabler_seller_authorizations_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─ enabler_seller_authorization_scopes (§8) ───────────────────────────────
-- Real FKs on both productId and categoryId: an unknown scope can never be
-- persisted. Postgres treats NULLs as distinct, so a category-scope row does
-- not collide with a product-scope row of the same authorization.
CREATE TABLE IF NOT EXISTS "enabler_seller_authorization_scopes" (
    "id" VARCHAR(64) NOT NULL,
    "authorizationId" VARCHAR(64) NOT NULL,
    "scopeType" "enabler_scope_type" NOT NULL,
    "productId" VARCHAR(64),
    "categoryId" VARCHAR(64),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enabler_seller_authorization_scopes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_seller_authorization_scopes_authorizationId_productId_key" ON "enabler_seller_authorization_scopes"("authorizationId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_seller_authorization_scopes_authorizationId_categoryId_key" ON "enabler_seller_authorization_scopes"("authorizationId", "categoryId");
CREATE INDEX IF NOT EXISTS "enabler_seller_authorization_scopes_authorizationId_idx" ON "enabler_seller_authorization_scopes"("authorizationId");

ALTER TABLE "enabler_seller_authorization_scopes"
    ADD CONSTRAINT "enabler_seller_authorization_scopes_authorizationId_fkey"
    FOREIGN KEY ("authorizationId") REFERENCES "enabler_seller_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_seller_authorization_scopes"
    ADD CONSTRAINT "enabler_seller_authorization_scopes_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_seller_authorization_scopes"
    ADD CONSTRAINT "enabler_seller_authorization_scopes_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── enabler_permanent_links (§12, §13) ─────────────────────────────────────
-- The link carries a stable public identifier and NOTHING else. Permissions are
-- never encoded here — they are re-derived from live authorizations on every
-- resolution, so a revocation takes effect immediately.
CREATE TABLE IF NOT EXISTS "enabler_permanent_links" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "publicCode" VARCHAR(32) NOT NULL,
    "status" "enabler_permanent_link_status" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(6),
    "revokedAt" TIMESTAMP(6),
    "lastResolvedAt" TIMESTAMP(6),
    "resolveCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_permanent_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_permanent_links_enablerId_key" ON "enabler_permanent_links"("enablerId");
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_permanent_links_publicCode_key" ON "enabler_permanent_links"("publicCode");
CREATE INDEX IF NOT EXISTS "enabler_permanent_links_status_idx" ON "enabler_permanent_links"("status");

ALTER TABLE "enabler_permanent_links"
    ADD CONSTRAINT "enabler_permanent_links_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── enabler_attributions (§11) ─────────────────────────────────────────────
-- "This conversion is attributable to this enabler" — never "this customer
-- belongs to this enabler". attributionKey is UNIQUE so the same logical
-- interaction cannot be attributed twice (§33).
CREATE TABLE IF NOT EXISTS "enabler_attributions" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "customerId" VARCHAR(64),
    "context" "enabler_attribution_context" NOT NULL,
    "status" "enabler_attribution_status" NOT NULL DEFAULT 'RECORDED',
    "attributionKey" VARCHAR(128) NOT NULL,
    "productId" VARCHAR(64),
    "draftId" VARCHAR(64),
    "customerLinkId" VARCHAR(64),
    "orderId" VARCHAR(64),
    "metadata" JSONB,
    "convertedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_attributions_attributionKey_key" ON "enabler_attributions"("attributionKey");
CREATE INDEX IF NOT EXISTS "enabler_attributions_enablerId_status_idx" ON "enabler_attributions"("enablerId", "status");
CREATE INDEX IF NOT EXISTS "enabler_attributions_customerId_idx" ON "enabler_attributions"("customerId");
CREATE INDEX IF NOT EXISTS "enabler_attributions_orderId_idx" ON "enabler_attributions"("orderId");
CREATE INDEX IF NOT EXISTS "enabler_attributions_draftId_idx" ON "enabler_attributions"("draftId");

ALTER TABLE "enabler_attributions"
    ADD CONSTRAINT "enabler_attributions_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_attributions"
    ADD CONSTRAINT "enabler_attributions_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── enabler_order_drafts (§15–§20, §43, §44) ───────────────────────────────
-- The Enabler Order Builder. This is a PROPOSAL for a customer the enabler is
-- assisting. It is explicitly NOT the customer's cart and NOT a Maysar order.
-- convertedOrderId / conversionIdempotencyKey are UNIQUE so a retried
-- conversion can never produce two Maysar orders (§39).
CREATE TABLE IF NOT EXISTS "enabler_order_drafts" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "customerId" VARCHAR(64),
    "customerRef" VARCHAR(255),
    "status" "enabler_draft_status" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pricingContext" JSONB,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "convertedOrderId" VARCHAR(64),
    "convertedCheckoutSessionId" VARCHAR(64),
    "conversionIdempotencyKey" VARCHAR(128),
    "readyAt" TIMESTAMP(6),
    "acceptedAt" TIMESTAMP(6),
    "convertedAt" TIMESTAMP(6),
    "cancelledAt" TIMESTAMP(6),
    "cancelReason" TEXT,
    "expiresAt" TIMESTAMP(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_order_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_order_drafts_convertedOrderId_key" ON "enabler_order_drafts"("convertedOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "enabler_order_drafts_conversionIdempotencyKey_key" ON "enabler_order_drafts"("conversionIdempotencyKey");
CREATE INDEX IF NOT EXISTS "enabler_order_drafts_enablerId_status_idx" ON "enabler_order_drafts"("enablerId", "status");
CREATE INDEX IF NOT EXISTS "enabler_order_drafts_customerId_idx" ON "enabler_order_drafts"("customerId");
CREATE INDEX IF NOT EXISTS "enabler_order_drafts_status_expiresAt_idx" ON "enabler_order_drafts"("status", "expiresAt");

ALTER TABLE "enabler_order_drafts"
    ADD CONSTRAINT "enabler_order_drafts_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_order_drafts"
    ADD CONSTRAINT "enabler_order_drafts_convertedOrderId_fkey"
    FOREIGN KEY ("convertedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── enabler_order_draft_items (§17, §18) ──────────────────────────────────
-- unitPrice / lineTotal are snapshots of AUTHORITATIVE catalog/seller pricing,
-- never client input. A hard CHECK rejects non-positive quantities so an
-- invalid line can never be persisted even by a buggy caller (§19, §41).
CREATE TABLE IF NOT EXISTS "enabler_order_draft_items" (
    "id" VARCHAR(64) NOT NULL,
    "draftId" VARCHAR(64) NOT NULL,
    "productId" VARCHAR(64) NOT NULL,
    "variantId" VARCHAR(64),
    "sellerId" VARCHAR(64) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
    "priceSource" VARCHAR(40) NOT NULL,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_order_draft_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enabler_order_draft_items_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "enabler_order_draft_items_unitPrice_check" CHECK ("unitPrice" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_order_draft_items_draftId_productId_variantId_key" ON "enabler_order_draft_items"("draftId", "productId", "variantId");
CREATE INDEX IF NOT EXISTS "enabler_order_draft_items_draftId_idx" ON "enabler_order_draft_items"("draftId");
CREATE INDEX IF NOT EXISTS "enabler_order_draft_items_sellerId_idx" ON "enabler_order_draft_items"("sellerId");

ALTER TABLE "enabler_order_draft_items"
    ADD CONSTRAINT "enabler_order_draft_items_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "enabler_order_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_order_draft_items"
    ADD CONSTRAINT "enabler_order_draft_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── enabler_customer_links (§21, §22) ─────────────────────────────────────
-- Single-use customer order link. Only the SHA-256 hash of the token is stored
-- (mirrors request_access_links). Consumption is a conditional atomic update on
-- status + consumedAt, so two concurrent consumers can never both succeed (§40).
CREATE TABLE IF NOT EXISTS "enabler_customer_links" (
    "id" VARCHAR(64) NOT NULL,
    "draftId" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "tokenPrefix" VARCHAR(16) NOT NULL,
    "status" "enabler_link_status" NOT NULL DEFAULT 'CREATED',
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "openedAt" TIMESTAMP(6),
    "reviewingAt" TIMESTAMP(6),
    "acceptedAt" TIMESTAMP(6),
    "consumedAt" TIMESTAMP(6),
    "consumedByUserId" VARCHAR(64),
    "revokedAt" TIMESTAMP(6),
    "revokedReason" TEXT,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "convertedOrderId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_customer_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_customer_links_tokenHash_key" ON "enabler_customer_links"("tokenHash");
CREATE INDEX IF NOT EXISTS "enabler_customer_links_draftId_idx" ON "enabler_customer_links"("draftId");
CREATE INDEX IF NOT EXISTS "enabler_customer_links_enablerId_status_idx" ON "enabler_customer_links"("enablerId", "status");
CREATE INDEX IF NOT EXISTS "enabler_customer_links_status_expiresAt_idx" ON "enabler_customer_links"("status", "expiresAt");

ALTER TABLE "enabler_customer_links"
    ADD CONSTRAINT "enabler_customer_links_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "enabler_order_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_customer_links"
    ADD CONSTRAINT "enabler_customer_links_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── enabler_earnings (§28–§32) ────────────────────────────────────────────
-- NOT a wallet. This is the attribution/qualification record that explains why
-- a commission exists; settlement flows through the existing commission and
-- wallet domains. orderId is UNIQUE: one order → at most one earning, enforced
-- by the database rather than application logic (§39, §40).
CREATE TABLE IF NOT EXISTS "enabler_earnings" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "sellerId" VARCHAR(64) NOT NULL,
    "draftId" VARCHAR(64),
    "authorizationId" VARCHAR(64),
    "status" "enabler_earning_status" NOT NULL DEFAULT 'ATTRIBUTED',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "earningRuleType" "enabler_earning_rule_type" NOT NULL,
    "earningRuleValue" DECIMAL(10,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "calculationContext" JSONB NOT NULL,
    "commissionId" VARCHAR(64),
    "walletTransactionId" VARCHAR(64),
    "payoutId" VARCHAR(64),
    "attributedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(6),
    "availableAt" TIMESTAMP(6),
    "paidAt" TIMESTAMP(6),
    "reversedAt" TIMESTAMP(6),
    "reversalReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "enabler_earnings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enabler_earnings_amount_check" CHECK ("amount" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "enabler_earnings_orderId_key" ON "enabler_earnings"("orderId");
CREATE INDEX IF NOT EXISTS "enabler_earnings_enablerId_status_idx" ON "enabler_earnings"("enablerId", "status");
CREATE INDEX IF NOT EXISTS "enabler_earnings_sellerId_idx" ON "enabler_earnings"("sellerId");
CREATE INDEX IF NOT EXISTS "enabler_earnings_status_qualifiedAt_idx" ON "enabler_earnings"("status", "qualifiedAt");

ALTER TABLE "enabler_earnings"
    ADD CONSTRAINT "enabler_earnings_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enabler_earnings"
    ADD CONSTRAINT "enabler_earnings_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── enabler_enforcement_actions (§34, §52) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "enabler_enforcement_actions" (
    "id" VARCHAR(64) NOT NULL,
    "enablerId" VARCHAR(64) NOT NULL,
    "action" "enabler_enforcement_type" NOT NULL,
    "previousStatus" "enabler_status" NOT NULL,
    "newStatus" "enabler_status" NOT NULL,
    "reason" TEXT,
    "actorUserId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enabler_enforcement_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "enabler_enforcement_actions_enablerId_createdAt_idx" ON "enabler_enforcement_actions"("enablerId", "createdAt");
CREATE INDEX IF NOT EXISTS "enabler_enforcement_actions_action_idx" ON "enabler_enforcement_actions"("action");

ALTER TABLE "enabler_enforcement_actions"
    ADD CONSTRAINT "enabler_enforcement_actions_enablerId_fkey"
    FOREIGN KEY ("enablerId") REFERENCES "enabler_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── orders: index the existing attribution column (§24, §41) ──────────────
-- enablerId already exists on orders and Checkout_CheckoutSession (added by
-- 20260316093000_add_public_codes_and_enabler_attribution); this only adds the
-- index the Prisma schema now declares.
CREATE INDEX IF NOT EXISTS "orders_enablerId_idx" ON "orders"("enablerId");