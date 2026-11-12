import prisma from '../../infrastructure/database/prisma';
import { CalculateProfitabilityScore } from './CalculateProfitabilityScore';
import { CalculateInventoryHealth } from './CalculateInventoryHealth';
import { COMMITTED_ORDER_STATUSES } from '../constants/orderStatuses';

// Prisma requires the Order_OrderStatus enum type for status filters.
// The enum values in COMMITTED_ORDER_STATUSES are valid enum members — cast to any[]
// to satisfy the Prisma type without duplicating the enum import.
const COMMITTED_STATUSES_PRISMA = COMMITTED_ORDER_STATUSES as any[];

export class GetSellerDashboardEnhanced {
  async execute(sellerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Section 1: Money Snapshot
    // Use committed order statuses (CONFIRMED, PROCESSING, ASSIGNED, SHIPPED,
    // IN_TRANSIT, DELIVERED, COMPLETED) so revenue reflects all accepted orders,
    // not just the final DELIVERED state.
    const todayOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: today },
        status: { in: COMMITTED_STATUSES_PRISMA }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    const thisMonthOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: monthStart },
        status: { in: COMMITTED_STATUSES_PRISMA }
      },
      _sum: { totalAmount: true }
    });

    const lastMonthOrders = await prisma.order_Order.aggregate({
      where: {
        sellerId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        status: { in: COMMITTED_STATUSES_PRISMA }
      },
      _sum: { totalAmount: true }
    });

    const wallet = await prisma.wallet_Wallet.findFirst({
      where: { userId: sellerId }
    });

    const nextPayout = await prisma.payout.findFirst({
      where: { userId: sellerId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    const thisMonthCommissions = await prisma.commission.aggregate({
      where: { sellerId, createdAt: { gte: monthStart } },
      _sum: { amount: true }
    });

    const todayAmount = Number(todayOrders._sum?.totalAmount ?? 0);
    const thisMonthAmount = Number(thisMonthOrders._sum?.totalAmount ?? 0);
    const lastMonthAmount = Number(lastMonthOrders._sum?.totalAmount ?? 0);
    const commissionAmount = Number(thisMonthCommissions._sum?.amount ?? 0);

    const moneySnapshot = {
      todaySales: {
        amount: todayAmount,
        currency: 'TZS',
        orderCount: todayOrders._count?.id ?? 0
      },
      thisMonthRevenue: {
        amount: thisMonthAmount,
        currency: 'TZS',
        growth: this.calculateGrowth(thisMonthAmount, lastMonthAmount)
      },
      walletBalance: {
        available: wallet?.balance ?? 0,
        pending: wallet?.frozenAmount ?? 0,
        currency: 'TZS'
      },
      nextPayoutDate: nextPayout?.createdAt ?? null,
      netPayout: thisMonthAmount - commissionAmount
    };

    // Section 2: Performance Insights
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const salesTrendData = await prisma.analytics_SellerDailySales.findMany({
      where: { sellerId, date: { gte: last7Days } },
      orderBy: { date: 'asc' }
    });

    // Repeat customers: count only committed-status orders for consistency with revenue metrics
    const repeatCustomers = await prisma.order_Order.groupBy({
      by: ['buyerId'],
      where: { sellerId, status: { in: COMMITTED_STATUSES_PRISMA } },
      _count: { id: true }
    });

    const repeatBuyerCount = repeatCustomers.filter(r => (r._count as any)?.id > 1).length;
    const repeatCustomerRate = repeatCustomers.length > 0
      ? (repeatBuyerCount / repeatCustomers.length) * 100
      : 0;

    // Best product: prefer nightly analytics table, fall back to live order_OrderItem aggregation
    const bestProductPerf = await prisma.analytics_SellerProductPerformance.findFirst({
      where: { sellerId },
      orderBy: { revenue: 'desc' }
    });

    let bestProductName = 'N/A';
    let bestProductUnitsSold = 0;
    let bestProductRevenue: number = 0;

    if (bestProductPerf) {
      const product = await prisma.product.findUnique({
        where: { id: bestProductPerf.productId },
        select: { title: true }
      });
      bestProductName = product?.title ?? 'N/A';
      bestProductUnitsSold = bestProductPerf.orders ?? 0;
      bestProductRevenue = Number(bestProductPerf.revenue ?? 0);
    } else {
      // Fallback: derive best product from actual order line items across committed-status orders
      const topItems = await prisma.order_OrderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            sellerId,
            status: { in: COMMITTED_STATUSES_PRISMA }
          }
        },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1
      });

      if (topItems.length > 0) {
        const top = topItems[0];
        const product = await prisma.product.findUnique({
          where: { id: top.productId },
          select: { title: true }
        });
        bestProductName = product?.title ?? 'N/A';
        bestProductUnitsSold = Number((top._sum as any)?.quantity ?? 0);
        // Revenue approximation: price * quantity (per-item price at order time)
        bestProductRevenue =
          Number((top._sum as any)?.price ?? 0) * Number((top._sum as any)?.quantity ?? 0);
      }
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
        unitsSold: bestProductUnitsSold,
        revenue: bestProductRevenue
      }
    };

    // Section 3: Action Center
    const actionItems = await prisma.analytics_SellerActionItem.findMany({
      where: { sellerId, isResolved: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    });

    // Section 4: Orders — raw groupBy for pipeline visibility (all statuses)
    const orderCounts = await prisma.order_Order.groupBy({
      by: ['status'],
      where: { sellerId },
      _count: { id: true }
    });

    const orders = {
      new:        orderCounts.find(o => o.status === 'PENDING')?._count?.id    ?? 0,
      processing: orderCounts.find(o => o.status === 'CONFIRMED')?._count?.id  ?? 0,
      shipped:    orderCounts.find(o => o.status === 'IN_TRANSIT')?._count?.id ?? 0,
      completed:  orderCounts.find(o => o.status === 'DELIVERED')?._count?.id  ?? 0,
      disputed:   orderCounts.find(o => o.status === 'CANCELLED')?._count?.id  ?? 0
    };

    // Section 5: Payout Transparency — revenue from all committed statuses
    const payoutTransparency = {
      totalEarned: thisMonthAmount,
      commissionDeducted: commissionAmount,
      netPayout: thisMonthAmount - commissionAmount,
      nextPayoutDate: nextPayout?.createdAt?.toISOString() ?? null,
      feeBreakdown: [
        { type: 'Commission', amount: commissionAmount }
      ]
    };

    // Section 6: Inventory Health — call live use case instead of reading stale snapshot
    // The raw analytics_SellerInventoryHealth.groupBy can contain orphaned/variant-level rows
    // that don't match the seller's actual catalog products. CalculateInventoryHealth computes
    // live from inventory_StockItem, consistent with the catalog and inventory service.
    const inventoryHealthResult = await new CalculateInventoryHealth().execute(sellerId);

    const inventorySummary = {
      inStock:    inventoryHealthResult.inStock,
      lowStock:   inventoryHealthResult.lowStock,
      outOfStock: inventoryHealthResult.outOfStock,
      alerts:     [] as any[]
    };

    // Section 7: Reputation & Reviews
    // avg delivery time stays DELIVERED-only — delivery time only meaningful for delivered orders
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

    // Section 8: Profitability Score
    const scoreUseCase = new CalculateProfitabilityScore();
    const scoreBreakdown = await scoreUseCase.execute(sellerId);

    const profitabilityScore = {
      score: scoreBreakdown.total,
      status: this.getScoreStatus(scoreBreakdown.total),
      breakdown: {
        salesGrowth:        Math.round(scoreBreakdown.salesGrowth),
        repeatBuyers:       Math.round(scoreBreakdown.repeatBuyers),
        responseTime:       Math.round(scoreBreakdown.responseTime),
        orderCompletion:    Math.round(scoreBreakdown.orderCompletion),
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

  private calculateTrend(data: Array<{ revenue: unknown }>): string {
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
