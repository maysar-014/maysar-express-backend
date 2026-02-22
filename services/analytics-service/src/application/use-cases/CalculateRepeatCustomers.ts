import prisma from '../../infrastructure/database/prisma';

export class CalculateRepeatCustomers {
  async execute(sellerId: string): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);

    const buyerOrders = await prisma.order_Order.groupBy({
      by: ['buyerId'],
      where: {
        sellerId,
        createdAt: { gte: monthStart }
      },
      _count: { id: true }
    });

    const repeatBuyers = buyerOrders.filter(b => b._count.id > 1).length;
    const totalBuyers = buyerOrders.length;

    const repeatRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;

    await prisma.analytics_SellerMetrics.upsert({
      where: { sellerId },
      update: { repeatCustomerRate: repeatRate },
      create: { sellerId, repeatCustomerRate: repeatRate }
    });

    return repeatRate;
  }
}
