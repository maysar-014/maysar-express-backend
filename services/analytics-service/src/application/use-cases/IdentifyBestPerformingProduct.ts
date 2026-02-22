import prisma from '../../infrastructure/database/prisma';

export class IdentifyBestPerformingProduct {
  async execute(sellerId: string) {
    const bestProduct = await prisma.order_OrderItem.groupBy({
      by: ['productId'],
      where: {
        order: { sellerId, status: 'DELIVERED' }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1
    });

    if (bestProduct.length === 0) {
      return null;
    }

    const productId = bestProduct[0].productId;
    const totalUnits = bestProduct[0]._sum.quantity || 0;

    // Calculate revenue: sum(price * quantity)
    const revenueData = await prisma.order_OrderItem.aggregate({
      where: {
        productId,
        order: { sellerId, status: 'DELIVERED' }
      },
      _sum: { quantity: true },
      _avg: { price: true }
    });

    const totalRevenue = (revenueData._sum.quantity || 0) * (revenueData._avg.price || 0);

    // Get product name
    const product = await prisma.catalog_Product.findUnique({
      where: { id: productId },
      select: { title: true }
    });

    await prisma.analytics_SellerProductPerformance.upsert({
      where: {
        sellerId_productId: {
          sellerId,
          productId
        }
      },
      update: {
        orders: totalUnits,
        revenue: totalRevenue
      },
      create: {
        sellerId,
        productId,
        orders: totalUnits,
        revenue: totalRevenue
      }
    });

    await prisma.analytics_SellerMetrics.upsert({
      where: { sellerId },
      update: {
        bestPerformingProductId: productId,
        bestPerformingProductRevenue: totalRevenue,
        bestPerformingProductUnitsSold: totalUnits
      },
      create: {
        sellerId,
        bestPerformingProductId: productId,
        bestPerformingProductRevenue: totalRevenue,
        bestPerformingProductUnitsSold: totalUnits
      }
    });

    return {
      productId,
      productName: product?.title || 'Unknown',
      revenue: totalRevenue,
      unitsSold: totalUnits
    };
  }
}
