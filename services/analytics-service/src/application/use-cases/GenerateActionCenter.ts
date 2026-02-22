import prisma from '../../infrastructure/database/prisma';

export class GenerateActionCenter {
  async execute(sellerId: string) {
    const actions: any[] = [];

    // Restock Alerts
    const lowStockProducts = await prisma.analytics_SellerInventoryHealth.findMany({
      where: {
        sellerId,
        daysUntilStockout: { lte: 3 }
      }
    });

    for (const product of lowStockProducts) {
      await prisma.analytics_SellerActionItem.upsert({
        where: {
          id: `${sellerId}-restock-${product.productId}`
        },
        update: {},
        create: {
          sellerId,
          type: 'RESTOCK',
          priority: 'HIGH',
          title: `Restock ${product.productId}`,
          description: `Product will run out in ${product.daysUntilStockout} days`,
          productId: product.productId,
          isResolved: false
        }
      });
      actions.push({
        type: 'RESTOCK',
        priority: 'HIGH',
        productId: product.productId
      });
    }

    // Pending Inquiries
    const pendingTickets = await prisma.support_Ticket.count({
      where: {
        userId: sellerId,
        status: 'OPEN'
      }
    });

    if (pendingTickets > 0) {
      await prisma.analytics_SellerActionItem.upsert({
        where: {
          id: `${sellerId}-inquiries`
        },
        update: {},
        create: {
          sellerId,
          type: 'RESPOND_INQUIRY',
          priority: pendingTickets > 5 ? 'HIGH' : 'MEDIUM',
          title: `${pendingTickets} pending customer questions`,
          description: `You have ${pendingTickets} unanswered customer inquiries`,
          isResolved: false
        }
      });
      actions.push({
        type: 'RESPOND_INQUIRY',
        priority: pendingTickets > 5 ? 'HIGH' : 'MEDIUM',
        count: pendingTickets
      });
    }

    // Low Conversion Products
    const lowConversionProducts = await prisma.analytics_SellerProductPerformance.findMany({
      where: {
        sellerId,
        conversionRate: { lt: 0.05 }
      }
    });

    if (lowConversionProducts.length > 0) {
      await prisma.analytics_SellerActionItem.upsert({
        where: {
          id: `${sellerId}-low-conversion`
        },
        update: {},
        create: {
          sellerId,
          type: 'PRICE_ADJUSTMENT',
          priority: 'MEDIUM',
          title: `${lowConversionProducts.length} products with low conversion`,
          description: `Consider adjusting prices or improving descriptions for ${lowConversionProducts.length} products`,
          isResolved: false
        }
      });
      actions.push({
        type: 'PRICE_ADJUSTMENT',
        priority: 'MEDIUM',
        count: lowConversionProducts.length
      });
    }

    return actions;
  }
}
