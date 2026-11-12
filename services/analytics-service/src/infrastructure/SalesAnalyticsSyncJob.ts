import prisma from './database/prisma';
import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';

/**
 * Deterministically writes daily sales-insight snapshots into
 * `Analytics_SalesAnalytics` from the canonical `Order_Order` table.
 *
 * This replaces the original event-driven seller sales saga flow (since
 * deleted), which only fired when a 5-step event chain was kicked off by
 * `SalesDataCollectionRequested` — an event no service ever publishes —
 * leaving `Analytics_SalesAnalytics` permanently empty.
 *
 * One insights row is written per seller per UTC day (idempotent: an existing
 * row for today is updated rather than duplicated).
 */
export class SalesAnalyticsSyncJob {
  async execute(): Promise<void> {
    try {
      const startOfToday = this.startOfUtcDay(new Date());

      const sellers = await prisma.order_Order.groupBy({
        by: ['sellerId'],
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startOfToday }
        }
      });

      for (const { sellerId } of sellers) {
        await this.syncSeller(sellerId, startOfToday);
      }

      logger.info(`[SalesAnalyticsSyncJob] Completed for ${sellers.length} sellers`);
    } catch (error) {
      logger.error('[SalesAnalyticsSyncJob] Error:', error);
    }
  }

  private async syncSeller(sellerId: string, startOfToday: Date): Promise<void> {
    try {
      const todaysOrders = await prisma.order_Order.findMany({
        where: {
          sellerId,
          status: 'DELIVERED',
          createdAt: { gte: startOfToday }
        },
        select: { totalAmount: true }
      });

      const revenue = todaysOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
      const orderCount = todaysOrders.length;
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      const insights = JSON.stringify({
        revenue,
        orderCount,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        computedAt: new Date().toISOString()
      });

      const existing = await prisma.analytics_SalesAnalytics.findFirst({
        where: { sellerId, date: startOfToday },
        select: { id: true }
      });

      if (existing) {
        await prisma.analytics_SalesAnalytics.update({
          where: { id: existing.id },
          data: { insights }
        });
      } else {
        await prisma.analytics_SalesAnalytics.create({
          data: { sellerId, date: startOfToday, insights }
        });
      }
    } catch (error) {
      logger.error(`[SalesAnalyticsSyncJob] Error for seller ${sellerId}:`, error);
    }
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}