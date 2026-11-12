import prisma from '../../infrastructure/database/prisma';
import { classifyStockStatus } from '@shared/inventory/classifyStockStatus';

export class CalculateInventoryHealth {
  async execute(sellerId: string) {
    const products = await prisma.product.findMany({
      where: { sellerId }
    });

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // In-memory accumulator for live status counts (replaces final groupBy snapshot read)
    const liveStatusCounts = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };

    for (const product of products) {
      // ─── Phase 1: Live Stock ─────────────────────────────────────────────
      // inventory_StockItem.productVariantId references ProductVariant.id,
      // NOT Product.id. Must resolve variant IDs first.
      const variants = await prisma.productVariant.findMany({
        where: { productId: product.id },
        select: { id: true }
      });
      const variantIds = variants.map(v => v.id);

      const stockItems = variantIds.length > 0
        ? await prisma.inventory_StockItem.findMany({
            where: { productVariantId: { in: variantIds } },
            select: {
              productVariantId: true,
              quantityAvailable: true,
              quantityReserved: true,
              reorderPoint: true
            }
          })
        : [];

      // Live currentStock: subtract reserved so it matches storefront effective availability
      const currentStock = stockItems.reduce(
        (sum, item) => sum + Math.max(0, item.quantityAvailable - item.quantityReserved),
        0
      );
      const reorderPoint = stockItems[0]?.reorderPoint ?? 0;

      // Live stockStatus: shared classification — always agrees with storefront
      const stockStatus = classifyStockStatus(currentStock, reorderPoint).toUpperCase() as
        'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

      // Accumulate live counts for summary — no snapshot read needed
      if (stockStatus in liveStatusCounts) {
        liveStatusCounts[stockStatus]++;
      }

      // ─── Phase 2: Velocity (background, from order history) ─────────────
      // salesVelocity and daysUntilStockout are batch metrics — acceptable as
      // slightly stale. Exclude CANCELLED orders (not valid enum REFUNDED).
      const salesData = await prisma.order_OrderItem.aggregate({
        where: {
          productId: product.id,
          order: {
            createdAt: { gte: last30Days },
            status: { notIn: ['CANCELLED'] }
          }
        },
        _sum: { quantity: true }
      });

      const totalSold = salesData._sum?.quantity ?? 0;
      const salesVelocity = totalSold / 30; // units per day

      // Use LIVE currentStock for daysUntilStockout so the estimate is accurate
      const daysUntilStockout = salesVelocity > 0 ? Math.ceil(currentStock / salesVelocity) : 999;

      // ─── Narrow upsert: write velocity fields only ───────────────────────
      // currentStock and stockStatus are NOT written on update — they are always
      // computed live on the read path. The create block retains them for
      // backward compatibility (new rows only) and consistency audit.
      await prisma.analytics_SellerInventoryHealth.upsert({
        where: {
          sellerId_productId: {
            sellerId,
            productId: product.id
          }
        },
        update: {
          // Velocity-only update — currentStock/stockStatus removed from update path
          salesVelocity,
          daysUntilStockout
        },
        create: {
          sellerId,
          productId: product.id,
          // Live values on create for backward compat with external consumers
          currentStock,
          stockStatus,
          salesVelocity,
          daysUntilStockout
        }
      });
    }

    // ─── Summary: derived from live phase, not snapshot ───────────────────
    // No groupBy query — counts are accumulated in-memory from live inventory_StockItem data
    return {
      inStock: liveStatusCounts.IN_STOCK,
      lowStock: liveStatusCounts.LOW_STOCK,
      outOfStock: liveStatusCounts.OUT_OF_STOCK
    };
  }
}
