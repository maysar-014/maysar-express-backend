-- AlterEnum
ALTER TYPE "Order_OrderStatus" ADD VALUE 'SHIPPED';

-- AlterTable
ALTER TABLE "order_seller_cod_risk" ALTER COLUMN "updatedAt" DROP DEFAULT;
