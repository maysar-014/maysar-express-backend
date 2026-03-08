import prisma from '../../infrastructure/database/prisma';

export class CalculateInventoryHealth {
  async execute(sellerId: string) {
    const products = await prisma.product.findMany({
      where: { sellerId }
    });

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    for (const product of products) {
      // Get current stock
      const stockItems = await prisma.inventory_StockItem.findMany({
        where: { productVariantId: product.id }
      });

      const currentStock = stockItems.reduce((sum, item) => sum + item.quantityAvailable, 0);

      // Calculate sales velocity
      const salesData = await prisma.order_OrderItem.aggregate({
        where: {
          productId: product.id,
          order: { createdAt: { gte: last30Days } }
        },
        _sum: { quantity: true }
      });

      const totalSold = salesData._sum.quantity || 0;
      const salesVelocity = totalSold / 30; // units per day

      // Calculate days until stockout
      const daysUntilStockout = salesVelocity > 0 ? Math.ceil(currentStock / salesVelocity) : 999;

      // Determine status
      let stockStatus = 'IN_STOCK';
      if (currentStock === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (daysUntilStockout <= 7) {
        stockStatus = 'LOW_STOCK';
      }

      // Upsert inventory health
      await prisma.analytics_SellerInventoryHealth.upsert({
        where: {
          sellerId_productId: {
            sellerId,
            productId: product.id
          }
        },
        update: {
          currentStock,
          stockStatus,
          salesVelocity,
          daysUntilStockout
        },
        create: {
          sellerId,
          productId: product.id,
          currentStock,
          stockStatus,
          salesVelocity,
          daysUntilStockout
        }
      });
    }

    // Get summary
    const summary = await prisma.analytics_SellerInventoryHealth.groupBy({
      by: ['stockStatus'],
      where: { sellerId },
      _count: { id: true }
    });

    return {
      inStock: summary.find(s => s.stockStatus === 'IN_STOCK')?._count.id || 0,
      lowStock: summary.find(s => s.stockStatus === 'LOW_STOCK')?._count.id || 0,
      outOfStock: summary.find(s => s.stockStatus === 'OUT_OF_STOCK')?._count.id || 0
    };
  }
}
