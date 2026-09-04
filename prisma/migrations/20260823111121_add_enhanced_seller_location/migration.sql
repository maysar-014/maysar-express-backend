-- DropForeignKey
ALTER TABLE "catalog_product_locations" DROP CONSTRAINT "catalog_product_locations_locationId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_stock_transfers" DROP CONSTRAINT "catalog_stock_transfers_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_stock_transfers" DROP CONSTRAINT "catalog_stock_transfers_toLocationId_fkey";

-- DropForeignKey
ALTER TABLE "order_master_order_items" DROP CONSTRAINT "order_master_order_items_masterOrderId_fkey";

-- DropForeignKey
ALTER TABLE "order_master_order_items" DROP CONSTRAINT "order_master_order_items_sellerOrderId_fkey";

-- AlterTable
ALTER TABLE "catalog_product_locations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog_seller_locations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog_stock_transfers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "logistics_consolidation_audits" ALTER COLUMN "deliveryGroupIds" DROP DEFAULT,
ALTER COLUMN "groupSizes" DROP DEFAULT,
ALTER COLUMN "rulesApplied" DROP DEFAULT,
ALTER COLUMN "totalSavingsTzs" DROP DEFAULT,
ALTER COLUMN "pricingVersion" DROP DEFAULT;

-- AlterTable
ALTER TABLE "logistics_delivery_groups" ALTER COLUMN "sellerOrderIds" DROP DEFAULT,
ALTER COLUMN "pickupSequence" DROP DEFAULT,
ALTER COLUMN "buyerDestination" DROP DEFAULT,
ALTER COLUMN "totalDeliveryCost" DROP DEFAULT,
ALTER COLUMN "pricingVersion" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "order_master_orders" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "order_master_order_items" ADD CONSTRAINT "order_master_order_items_masterOrderId_fkey" FOREIGN KEY ("masterOrderId") REFERENCES "order_master_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_master_order_items" ADD CONSTRAINT "order_master_order_items_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_locations" ADD CONSTRAINT "catalog_product_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "catalog_seller_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_stock_transfers" ADD CONSTRAINT "catalog_stock_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "catalog_seller_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_stock_transfers" ADD CONSTRAINT "catalog_stock_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "catalog_seller_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_fulfillment_selections" ADD CONSTRAINT "catalog_fulfillment_selections_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "catalog_seller_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_fulfillment_selections_checkout" RENAME TO "catalog_fulfillment_selections_checkoutId_idx";

-- RenameIndex
ALTER INDEX "idx_product_locations_location" RENAME TO "catalog_product_locations_locationId_idx";

-- RenameIndex
ALTER INDEX "idx_product_locations_product" RENAME TO "catalog_product_locations_productId_idx";

-- RenameIndex
ALTER INDEX "idx_product_locations_seller" RENAME TO "catalog_product_locations_sellerId_idx";

-- RenameIndex
ALTER INDEX "uq_product_location" RENAME TO "catalog_product_locations_productId_locationId_key";

-- RenameIndex
ALTER INDEX "idx_seller_locations_coords" RENAME TO "catalog_seller_locations_latitude_longitude_idx";

-- RenameIndex
ALTER INDEX "idx_seller_locations_seller" RENAME TO "catalog_seller_locations_sellerId_idx";

-- RenameIndex
ALTER INDEX "idx_seller_locations_status" RENAME TO "catalog_seller_locations_sellerId_status_idx";

-- RenameIndex
ALTER INDEX "idx_stock_transfers_product" RENAME TO "catalog_stock_transfers_productId_idx";

-- RenameIndex
ALTER INDEX "idx_stock_transfers_seller" RENAME TO "catalog_stock_transfers_sellerId_idx";

-- RenameIndex
ALTER INDEX "lca_masterOrderId_idx" RENAME TO "logistics_consolidation_audits_masterOrderId_idx";

-- RenameIndex
ALTER INDEX "ldg_masterOrderId_idx" RENAME TO "logistics_delivery_groups_masterOrderId_idx";

-- RenameIndex
ALTER INDEX "ldg_status_idx" RENAME TO "logistics_delivery_groups_status_idx";

-- RenameIndex
ALTER INDEX "order_master_order_items_sellerOrderId_unique" RENAME TO "order_master_order_items_sellerOrderId_key";
