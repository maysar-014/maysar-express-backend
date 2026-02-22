-- CreateTable Analytics_SellerDailySales
CREATE TABLE "analytics_seller_daily_sales" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_seller_daily_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable Analytics_SellerProductPerformance
CREATE TABLE "analytics_seller_product_performance" (
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

-- CreateTable Analytics_SellerInventoryHealth
CREATE TABLE "analytics_seller_inventory_health" (
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

-- CreateTable Analytics_SellerActionItem
CREATE TABLE "analytics_seller_action_items" (
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

-- AlterTable Analytics_SellerMetrics
ALTER TABLE "Analytics_SellerMetrics" ADD COLUMN "todaySales" DECIMAL(12,2),
ADD COLUMN "todayOrderCount" INTEGER,
ADD COLUMN "thisMonthRevenue" DECIMAL(12,2),
ADD COLUMN "lastMonthRevenue" DECIMAL(12,2),
ADD COLUMN "monthOverMonthGrowth" DOUBLE PRECISION,
ADD COLUMN "repeatCustomerRate" DOUBLE PRECISION,
ADD COLUMN "bestPerformingProductId" TEXT,
ADD COLUMN "bestPerformingProductRevenue" DECIMAL(12,2),
ADD COLUMN "bestPerformingProductUnitsSold" INTEGER,
ADD COLUMN "pendingCustomerQuestions" INTEGER,
ADD COLUMN "lowConversionProductCount" INTEGER,
ADD COLUMN "profitabilityScore" INTEGER,
ADD COLUMN "averageRating" DOUBLE PRECISION,
ADD COLUMN "responseRate" DOUBLE PRECISION,
ADD COLUMN "averageDeliveryTime" DOUBLE PRECISION,
ADD COLUMN "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "analytics_seller_daily_sales_sellerId_date_key" ON "analytics_seller_daily_sales"("sellerId", "date");

-- CreateIndex
CREATE INDEX "analytics_seller_daily_sales_sellerId_date_idx" ON "analytics_seller_daily_sales"("sellerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_seller_product_performance_sellerId_productId_key" ON "analytics_seller_product_performance"("sellerId", "productId");

-- CreateIndex
CREATE INDEX "analytics_seller_product_performance_sellerId_revenue_idx" ON "analytics_seller_product_performance"("sellerId", "revenue");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_seller_inventory_health_sellerId_productId_key" ON "analytics_seller_inventory_health"("sellerId", "productId");

-- CreateIndex
CREATE INDEX "analytics_seller_inventory_health_sellerId_stockStatus_idx" ON "analytics_seller_inventory_health"("sellerId", "stockStatus");

-- CreateIndex
CREATE INDEX "analytics_seller_action_items_sellerId_isResolved_priority_idx" ON "analytics_seller_action_items"("sellerId", "isResolved", "priority");

-- AddForeignKey
ALTER TABLE "analytics_seller_daily_sales" ADD CONSTRAINT "analytics_seller_daily_sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_product_performance" ADD CONSTRAINT "analytics_seller_product_performance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_inventory_health" ADD CONSTRAINT "analytics_seller_inventory_health_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_action_items" ADD CONSTRAINT "analytics_seller_action_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;
