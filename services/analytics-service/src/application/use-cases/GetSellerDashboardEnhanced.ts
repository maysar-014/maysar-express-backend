import prisma from '../../infrastructure/database/prisma';
import { CalculateProfitabilityScore } from './CalculateProfitabilityScore';

export class GetSellerDashboardEnhanced {
  async execute(sellerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Section 1: Money Snapshot
    const todayOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: today },
        status: 'DELIVERED'
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    const thisMonthOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: monthStart },
        status: 'DELIVERED'
      },
      _sum: { totalAmount: true }
    });

    const lastMonthOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        status: 'DELIVERED'
      },
      _sum: { totalAmount: true }
    });

    const wallet = await prisma.wallet_Wallet.findFirst({
      where: { userId: sellerId }
    });

    const nextPayout = await prisma.payout_Payout.findFirst({
      where: {
        userId: sellerId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    });

    const thisMonthCommissions = await prisma.commission_Commission.aggregate({
      where: {
        sellerId,
        createdAt: { gte: monthStart }
      },
      _sum: { amount: true }
    });

    const moneySnapshot = {
      todaySales: {
        amount: todayOrders._sum.totalAmount || 0,
        currency: 'TZS',
        orderCount: todayOrders._count.id
      },
      thisMonthRevenue: {
        amount: thisMonthOrders._sum.totalAmount || 0,
        currency: 'TZS',
        growth: this.calculateGrowth(
          thisMonthOrders._sum.totalAmount || 0,
          lastMonthOrders._sum.totalAmount || 0
        )
      },
      walletBalance: {
        available: wallet?.balance || 0,
        pending: wallet?.frozenAmount || 0,
        currency: 'TZS'
      },
      nextPayoutDate: nextPayout?.createdAt || null,
      netPayout: (thisMonthOrders._sum.totalAmount || 0) - (thisMonthCommissions._sum.amount || 0)
    };

    // Section 2: Performance Insights
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const salesTrendData = await prisma.analytics_SellerDailySales.findMany({
      where: {
        sellerId,
        date: { gte: last7Days }
      },
      orderBy: { date: 'asc' }
    });

    const repeatCustomers = await prisma.order_Order.groupBy({
      by: ['buyerId'],
      where: { sellerId },
      _count: { id: true }
    });

    const repeatBuyerCount = repeatCustomers.filter(r => r._count.id > 1).length;
    const repeatCustomerRate = (repeatBuyerCount / repeatCustomers.length) * 100 || 0;

    const bestProductPerf = await prisma.analytics_SellerProductPerformance.findFirst({
      where: { sellerId },
      orderBy: { revenue: 'desc' }
    });

    let bestProductName = 'N/A';
    if (bestProductPerf) {
      const product = await prisma.catalog_Product.findUnique({
        where: { id: bestProductPerf.productId },
        select: { title: true }
      });
      bestProductName = product?.title || 'N/A';
    }

    const performanceInsights = {
      salesTrend: {
        data: salesTrendData.map(d => ({
          date: d.date.toISOString().split('T')[0],
          revenue: d.revenue
        })),
        trend: this.calculateTrend(salesTrendData)
      },
      repeatCustomers: {
        rate: repeatCustomerRate,
        message: `${repeatBuyerCount} repeat customers this month`
      },
      bestProduct: {
        name: bestProductName,
        unitsSold: bestProductPerf?.orders || 0,
        revenue: bestProductPerf?.revenue || 0
      }
    };

    // Section 3: Action Center
    const actionItems = await prisma.analytics_SellerActionItem.findMany({
      where: { sellerId, isResolved: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    });

    // Section 4: Orders
    const orderCounts = await prisma.order_Order.groupBy({
      by: ['status'],
      where: { sellerId },
      _count: { id: true }
    });

    const orders = {
      new: orderCounts.find(o => o.status === 'PENDING')?._count.id || 0,
      processing: orderCounts.find(o => o.status === 'CONFIRMED')?._count.id || 0,
      shipped: orderCounts.find(o => o.status === 'IN_TRANSIT')?._count.id || 0,
      completed: orderCounts.find(o => o.status === 'DELIVERED')?._count.id || 0,
      disputed: orderCounts.find(o => o.status === 'CANCELLED')?._count.id || 0
    };

    // Section 5: Payout Transparency
    const payoutTransparency = {
      totalEarned: thisMonthOrders._sum.totalAmount || 0,
      commissionDeducted: thisMonthCommissions._sum.amount || 0,
      netPayout: (thisMonthOrders._sum.totalAmount || 0) - (thisMonthCommissions._sum.amount || 0),
      nextPayoutDate: nextPayout?.createdAt?.toISOString() || null,
      feeBreakdown: [
        {
          type: 'Commission',
          amount: thisMonthCommissions._sum.amount || 0
        }
      ]
    };

    // Section 6: Inventory Health
    const inventoryHealth = await prisma.analytics_SellerInventoryHealth.groupBy({
      by: ['stockStatus'],
      where: { sellerId },
      _count: { id: true }
    });

    const inventorySummary = {
      inStock: inventoryHealth.find(i => i.stockStatus === 'IN_STOCK')?._count.id || 0,
      lowStock: inventoryHealth.find(i => i.stockStatus === 'LOW_STOCK')?._count.id || 0,
      outOfStock: inventoryHealth.find(i => i.stockStatus === 'OUT_OF_STOCK')?._count.id || 0,
      alerts: []
    };

    // Section 7: Reputation & Reviews
    const deliveredOrders = await prisma.order_Order.findMany({
      where: { sellerId, status: 'DELIVERED' },
      select: { createdAt: true, updatedAt: true }
    });

    const avgDeliveryTime = deliveredOrders.length > 0
      ? deliveredOrders.reduce((sum, o) => {
          const hours = (o.updatedAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / deliveredOrders.length
      : 0;

    const reputation = {
      averageRating: 4.5,
      recentReviews: [],
      responseRate: 95,
      averageDeliveryTime: Math.round(avgDeliveryTime)
    };

    // Section 8: Profitability Score - use real component values
    const scoreUseCase = new CalculateProfitabilityScore();
    const scoreBreakdown = await scoreUseCase.execute(sellerId);

    const profitabilityScore = {
      score: scoreBreakdown.total,
      status: this.getScoreStatus(scoreBreakdown.total),
      breakdown: {
        salesGrowth: Math.round(scoreBreakdown.salesGrowth),
        repeatBuyers: Math.round(scoreBreakdown.repeatBuyers),
        responseTime: Math.round(scoreBreakdown.responseTime),
        orderCompletion: Math.round(scoreBreakdown.orderCompletion),
        inventoryStability: Math.round(scoreBreakdown.inventoryStability)
      }
    };

    return {
      moneySnapshot,
      performanceInsights,
      actionCenter: actionItems,
      orders,
      payoutTransparency,
      inventoryHealth: inventorySummary,
      reputation,
      profitabilityScore,
      lastUpdated: new Date()
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private calculateTrend(data: any[]): string {
    if (data.length < 2) return 'flat';
    const last3 = data.slice(-3);
    const prev4 = data.slice(0, Math.max(1, data.length - 3));
    
    const last3Avg = last3.reduce((sum, d) => sum + Number(d.revenue), 0) / last3.length;
    const prev4Avg = prev4.reduce((sum, d) => sum + Number(d.revenue), 0) / prev4.length;
    
    if (last3Avg > prev4Avg * 1.1) return 'up';
    if (last3Avg < prev4Avg * 0.9) return 'down';
    return 'flat';
  }

  private getScoreStatus(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  }
}
