import prisma from './database/prisma';
import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';

/**
 * Deterministically syncs enabler performance data from the canonical
 * `Enabler_Profile` table into `Analytics_EnablerAnalytics`.
 *
 * This replaces the original event-driven enabler analytics saga design
 * (since deleted), which subscribed to events (e.g. `PerformanceMetricsCollected`,
 * `TrainingScheduled`) that no service ever publishes, leaving
 * `Analytics_EnablerAnalytics` permanently empty.
 *
 * Note: `Enabler_Analytics` (a separate, richer table) is populated by the
 * enabler-service itself; this job only mirrors the aggregate fields that the
 * analytics dashboard reads from `Analytics_EnablerAnalytics`.
 */
export class EnablerAnalyticsSyncJob {
  async execute(): Promise<void> {
    try {
      const enablers = await prisma.enabler_Profile.findMany({
        select: {
          id: true,
          status: true,
          tier: true,
          totalSales: true,
          totalOrders: true,
          conversionRate: true,
          totalCommissionEarned: true,
          updatedAt: true,
          trainingCompletedAt: true
        }
      });

      for (const enabler of enablers) {
        await this.syncEnabler(enabler);
      }

      logger.info(`[EnablerAnalyticsSyncJob] Completed for ${enablers.length} enablers`);
    } catch (error) {
      logger.error('[EnablerAnalyticsSyncJob] Error:', error);
    }
  }

  private async syncEnabler(enabler: {
    id: string;
    status: string;
    tier: string;
    totalSales: unknown;
    totalOrders: number;
    conversionRate: unknown;
    totalCommissionEarned: unknown;
    updatedAt: Date;
    trainingCompletedAt: Date | null;
  }): Promise<void> {
    try {
      await prisma.analytics_EnablerAnalytics.upsert({
        where: { enablerId: enabler.id },
        update: {
          totalEarnings: Number(enabler.totalCommissionEarned) || 0,
          salesSupported: enabler.totalOrders,
          totalSalesValue: Number(enabler.totalSales) || 0,
          conversionRate: Number(enabler.conversionRate) || 0,
          lastActivity: enabler.updatedAt,
          // An enabler is "successful" when active/approved; surface a coarse rate.
          successRate: enabler.status === 'ACTIVE' || enabler.status === 'APPROVED' ? 1 : 0,
          // Training completions are tracked on the profile; count as certificates issued.
          certificatesIssued: enabler.trainingCompletedAt ? 1 : 0,
          lastTrainingDate: enabler.trainingCompletedAt,
          skillLevel: enabler.tier?.toLowerCase()
        },
        create: {
          enablerId: enabler.id,
          totalEarnings: Number(enabler.totalCommissionEarned) || 0,
          salesSupported: enabler.totalOrders,
          totalSalesValue: Number(enabler.totalSales) || 0,
          conversionRate: Number(enabler.conversionRate) || 0,
          lastActivity: enabler.updatedAt,
          successRate: enabler.status === 'ACTIVE' || enabler.status === 'APPROVED' ? 1 : 0,
          certificatesIssued: enabler.trainingCompletedAt ? 1 : 0,
          lastTrainingDate: enabler.trainingCompletedAt,
          skillLevel: enabler.tier?.toLowerCase()
        }
      });
    } catch (error) {
      logger.error(`[EnablerAnalyticsSyncJob] Error for enabler ${enabler.id}:`, error);
    }
  }
}