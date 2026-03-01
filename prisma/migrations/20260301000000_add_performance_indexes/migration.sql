-- AlterTable
ALTER TABLE "Checkout_Cart" ALTER COLUMN "expiresAt" SET DEFAULT (now() + '7 days'::interval);

-- AlterTable
ALTER TABLE "Checkout_CheckoutSession" ALTER COLUMN "expiresAt" SET DEFAULT (now() + '01:00:00'::interval);

-- AlterTable
ALTER TABLE "inventory_stock_items" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "wallet_idempotency_records" ALTER COLUMN "expiresAt" SET DEFAULT (now() + '24:00:00'::interval);

-- CreateTable
CREATE TABLE "saga_dead_letters" (
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
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saga_dead_letters_sagaId_key" ON "saga_dead_letters"("sagaId");

-- CreateIndex
CREATE INDEX "event_logs_eventId_idx" ON "event_logs"("eventId");

-- CreateIndex
CREATE INDEX "event_logs_consumerName_idx" ON "event_logs"("consumerName");

-- CreateIndex
CREATE UNIQUE INDEX "event_logs_eventId_consumerName_key" ON "event_logs"("eventId", "consumerName");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "auth_audit_logs_userId_idx" ON "auth_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "auth_audit_logs_timestamp_idx" ON "auth_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "catalog_product_variants_productId_idx" ON "catalog_product_variants"("productId");

-- CreateIndex
CREATE INDEX "catalog_product_variants_status_idx" ON "catalog_product_variants"("status");

-- CreateIndex
CREATE INDEX "inventory_reservations_orderId_idx" ON "inventory_reservations"("orderId");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_idx" ON "inventory_reservations"("status");

-- CreateIndex
CREATE INDEX "inventory_reservations_expiresAt_idx" ON "inventory_reservations"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_productVariantId_status_idx" ON "inventory_reservations"("productVariantId", "status");

-- CreateIndex
CREATE INDEX "inventory_movements_productVariantId_warehouseId_idx" ON "inventory_movements"("productVariantId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE INDEX "logistics_deliveries_orderId_idx" ON "logistics_deliveries"("orderId");

-- CreateIndex
CREATE INDEX "logistics_deliveries_courierId_idx" ON "logistics_deliveries"("courierId");

-- CreateIndex
CREATE INDEX "logistics_deliveries_status_idx" ON "logistics_deliveries"("status");

-- CreateIndex
CREATE INDEX "logistics_deliveries_createdAt_idx" ON "logistics_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX "logistics_location_history_courierId_timestamp_idx" ON "logistics_location_history"("courierId", "timestamp");

-- CreateIndex
CREATE INDEX "logistics_earnings_courierId_date_idx" ON "logistics_earnings"("courierId", "date");

-- CreateIndex
CREATE INDEX "notification_notifications_userId_idx" ON "notification_notifications"("userId");

-- CreateIndex
CREATE INDEX "notification_notifications_status_idx" ON "notification_notifications"("status");

-- CreateIndex
CREATE INDEX "notification_notifications_userId_status_idx" ON "notification_notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_cod_disputes_orderId_idx" ON "order_cod_disputes"("orderId");

-- CreateIndex
CREATE INDEX "order_cod_disputes_status_idx" ON "order_cod_disputes"("status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_payments_orderId_idx" ON "order_payments"("orderId");

-- CreateIndex
CREATE INDEX "order_payments_status_idx" ON "order_payments"("status");

-- CreateIndex
CREATE INDEX "order_settlements_orderId_idx" ON "order_settlements"("orderId");

-- CreateIndex
CREATE INDEX "order_settlements_status_idx" ON "order_settlements"("status");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payment_refunds_paymentId_idx" ON "payment_refunds"("paymentId");

-- CreateIndex
CREATE INDEX "payment_refunds_orderId_idx" ON "payment_refunds"("orderId");

-- CreateIndex
CREATE INDEX "payment_refunds_userId_idx" ON "payment_refunds"("userId");

-- CreateIndex
CREATE INDEX "payment_refunds_status_idx" ON "payment_refunds"("status");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_status_idx" ON "wallets"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_idx" ON "wallet_transactions"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

