import prisma from '../../infrastructure/database/prisma';

export class GenerateSalesTrend {
  async execute(sellerId: string) {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const orders = await prisma.order_Order.findMany({
      where: {
        sellerId,
        createdAt: { gte: last7Days },
        status: 'DELIVERED'
      },
      select: { createdAt: true, totalAmount: true }
    });

    const dailyData: { [key: string]: { revenue: number; count: number } } = {};

    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, count: 0 };
      }
      dailyData[date].revenue += Number(order.totalAmount);
      dailyData[date].count += 1;
    });

    const trendData = Object.entries(dailyData).map(([date, data]) => ({
      date: new Date(date),
      revenue: data.revenue,
      orderCount: data.count
    }));

    // Upsert daily sales records
    for (const record of trendData) {
      await prisma.analytics_SellerDailySales.upsert({
        where: {
          sellerId_date: {
            sellerId,
            date: record.date
          }
        },
        update: {
          revenue: record.revenue,
          orderCount: record.orderCount
        },
        create: {
          sellerId,
          date: record.date,
          revenue: record.revenue,
          orderCount: record.orderCount
        }
      });
    }

    return {
      data: trendData,
      trend: this.calculateTrend(trendData)
    };
  }

  private calculateTrend(data: any[]): string {
    if (data.length < 2) return 'flat';
    const last3 = data.slice(-3);
    const prev = data.slice(0, Math.max(1, data.length - 3));
    
    const last3Avg = last3.reduce((sum, d) => sum + d.revenue, 0) / last3.length;
    const prevAvg = prev.reduce((sum, d) => sum + d.revenue, 0) / prev.length;
    
    if (last3Avg > prevAvg * 1.1) return 'up';
    if (last3Avg < prevAvg * 0.9) return 'down';
    return 'flat';
  }
}
