import prisma from '../../infrastructure/database/prisma';
import { COMMITTED_ORDER_STATUSES, TERMINAL_COMPLETED_STATUSES } from '../constants/orderStatuses';

// Cast to any[] — Prisma requires Order_OrderStatus enum but the values are valid enum members
const COMMITTED_STATUSES_PRISMA         = COMMITTED_ORDER_STATUSES as any[];
const TERMINAL_COMPLETED_STATUSES_PRISMA = TERMINAL_COMPLETED_STATUSES as any[];

export interface ProfitabilityScoreBreakdown {
  salesGrowth: number;
  repeatBuyers: number;
  responseTime: number;
  orderCompletion: number;
  inventoryStability: number;
  total: number;
}

export class CalculateProfitabilityScore {
  async execute(sellerId: string): Promise<ProfitabilityScoreBreakdown> {
    const breakdown: ProfitabilityScoreBreakdown = {
      salesGrowth: 0,
      repeatBuyers: 0,
      responseTime: 0,
      orderCompletion: 0,
      inventoryStability: 0,
      total: 0
    };

    // Sales Growth (30 points) — from committed-status orders
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);

    const thisMonth = await prisma.order_Order.aggregate({
      where: { sellerId, createdAt: { gte: monthStart }, status: { in: COMMITTED_STATUSES_PRISMA } },
      _sum: { totalAmount: true }
    });

    const lastMonth = await prisma.order_Order.aggregate({
      where: { sellerId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { in: COMMITTED_STATUSES_PRISMA } },
      _sum: { totalAmount: true }
    });

    const thisMonthTotal = Number(thisMonth._sum?.totalAmount ?? 0);
    const lastMonthTotal = Number(lastMonth._sum?.totalAmount ?? 0);
    const growth = lastMonthTotal > 0
      ? (thisMonthTotal - lastMonthTotal) / lastMonthTotal
      : 0;

    breakdown.salesGrowth = Math.min(30, Math.max(0, growth * 150));

    // Repeat Buyers (20 points) — from committed-status orders only
    const thisMonthBuyers = await prisma.order_Order.groupBy({
      by: ['buyerId'],
      where: { sellerId, createdAt: { gte: monthStart }, status: { in: COMMITTED_STATUSES_PRISMA } },
      _count: { id: true }
    });

    const repeatBuyersThisMonth = thisMonthBuyers.filter(b => (b._count as any)?.id > 1).length;
    const repeatRate = thisMonthBuyers.length > 0 ? repeatBuyersThisMonth / thisMonthBuyers.length : 0;
    breakdown.repeatBuyers = repeatRate * 20;

    // Response Time (15 points) — from support tickets (independent of order status)
    const supportTickets = await prisma.support_Ticket.findMany({
      where: { userId: sellerId },
      select: { createdAt: true, resolvedAt: true }
    });

    if (supportTickets.length > 0) {
      const avgResponseHours = supportTickets.reduce((sum, ticket) => {
        if (ticket.resolvedAt) {
          const hours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0) / supportTickets.length;

      breakdown.responseTime = avgResponseHours < 1 ? 15 : avgResponseHours < 24 ? 10 : 5;
    } else {
      breakdown.responseTime = 15; // Default to max when no tickets
    }

    // Order Completion Rate (20 points)
    // Denominator: committed orders only (excludes DRAFT, PENDING, CANCELLED, verification states)
    // Numerator: terminal completed statuses (DELIVERED + COMPLETED)
    const totalOrders = await prisma.order_Order.count({
      where: { sellerId, status: { in: COMMITTED_STATUSES_PRISMA } }
    });
    const completedOrders = await prisma.order_Order.count({
      where: { sellerId, status: { in: TERMINAL_COMPLETED_STATUSES_PRISMA } }
    });

    const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0;
    breakdown.orderCompletion = completionRate * 20;

    // Inventory Stability (15 points) — from analytics snapshot (independent of order status)
    const inventoryHealth = await prisma.analytics_SellerInventoryHealth.groupBy({
      by: ['stockStatus'],
      where: { sellerId },
      _count: { id: true }
    });

    const totalProducts = inventoryHealth.reduce((sum, i) => sum + (i._count as any).id, 0);
    const inStockProducts = inventoryHealth.find(i => i.stockStatus === 'IN_STOCK');
    const inStockCount = (inStockProducts?._count as any)?.id ?? 0;
    const inventoryStability = totalProducts > 0 ? inStockCount / totalProducts : 0;
    breakdown.inventoryStability = inventoryStability * 15;

    breakdown.total = Math.min(100, Math.round(
      breakdown.salesGrowth + breakdown.repeatBuyers + breakdown.responseTime +
      breakdown.orderCompletion + breakdown.inventoryStability
    ));

    await prisma.analytics_SellerMetrics.upsert({
      where: { sellerId },
      update: { profitabilityScore: breakdown.total },
      create: { sellerId, profitabilityScore: breakdown.total }
    });

    return breakdown;
  }
}
