import prisma from './database/prisma';
import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';

/**
 * Deterministically syncs courier performance data from the canonical
 * `Logistics_Courier` table into `Analytics_CourierAnalytics`.
 *
 * This replaces the original event-driven courier analytics saga design
 * (since deleted), which subscribed to events (e.g. `CourierMetricsCollected`,
 * `CourierEarningsUpdated`) that no service ever publishes, leaving
 * `Analytics_CourierAnalytics` permanently empty.
 */
export class CourierAnalyticsSyncJob {
  async execute(): Promise<void> {
    try {
      const couriers = await prisma.logistics_Courier.findMany({
        select: {
          id: true,
          status: true,
          onTimeDeliveryRate: true,
          customerRating: true,
          completedDeliveries: true,
          totalEarnings: true,
          updatedAt: true
        }
      });

      for (const courier of couriers) {
        await this.syncCourier(courier);
      }

      logger.info(`[CourierAnalyticsSyncJob] Completed for ${couriers.length} couriers`);
    } catch (error) {
      logger.error('[CourierAnalyticsSyncJob] Error:', error);
    }
  }

  private async syncCourier(courier: {
    id: string;
    status: string;
    onTimeDeliveryRate: number;
    customerRating: number;
    completedDeliveries: number;
    totalEarnings: number;
    updatedAt: Date;
  }): Promise<void> {
    try {
      // Most recent delivered delivery for this courier (best-effort lastDelivery).
      const lastDelivery = await prisma.logistics_Delivery.findFirst({
        where: { courierId: courier.id, status: 'delivered' },
        orderBy: { actualDeliveryTime: 'desc' },
        select: { actualDeliveryTime: true }
      });

      // Blend on-time rate (0-100) with customer rating (0-5 → 0-100) into a
      // single 0-100 performance score. Falls back to on-time rate when the
      // rating is missing so we never fabricate a score from no data.
      const ratingScore = courier.customerRating > 0 ? courier.customerRating * 20 : courier.onTimeDeliveryRate;
      const performanceScore = Math.round((courier.onTimeDeliveryRate + ratingScore) / 2);

      await prisma.analytics_CourierAnalytics.upsert({
        where: { courierId: courier.id },
        update: {
          performanceScore,
          lastAnalysis: new Date(),
          totalEarnings: courier.totalEarnings,
          deliveriesCompleted: courier.completedDeliveries,
          lastDelivery: lastDelivery?.actualDeliveryTime ?? null,
          vehicleStatus: courier.status
        },
        create: {
          courierId: courier.id,
          performanceScore,
          lastAnalysis: new Date(),
          totalEarnings: courier.totalEarnings,
          deliveriesCompleted: courier.completedDeliveries,
          lastDelivery: lastDelivery?.actualDeliveryTime ?? null,
          vehicleStatus: courier.status
        }
      });
    } catch (error) {
      logger.error(`[CourierAnalyticsSyncJob] Error for courier ${courier.id}:`, error);
    }
  }
}