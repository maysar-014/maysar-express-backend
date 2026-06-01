import { PrismaClient } from '@prisma/client';
import { databaseManager } from '../../config/database.config';
import { logger } from '../monitoring/logger';

/**
 * CODTrustBackfillJob
 *
 * One-time backfill job that populates the new `lifetimeCODValue` and `activeExposure`
 * columns on `order_cod_trust_scores` from historical order data.
 *
 * Run this job ONCE after deploying the database migration, before enabling
 * COD_ENHANCED_ENGINE_ENABLED=true in production.
 *
 * The job is idempotent — safe to re-run without double-counting.
 * It resets both columns to 0 before computing, then sets the correct values.
 *
 * Usage:
 *   COD_BACKFILL_DRY_RUN=true  → logs what would be updated, no writes
 *   COD_BACKFILL_DRY_RUN=false → applies updates (default)
 */
export class CODTrustBackfillJob {
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_SLEEP_MS = 10;
  private readonly ACTIVE_STATUSES = [
    'pending', 'confirmed', 'processing', 'assigned', 'shipped', 'in_transit',
    'PENDING', 'CONFIRMED', 'PROCESSING', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT',
  ];
  private readonly TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async run(dryRun = false): Promise<void> {
    logger.info('[CODTrustBackfill] Starting backfill job', { dryRun });

    const startTime = Date.now();
    let totalBuyers = 0;
    let totalLifetimeSet = 0;
    let totalActiveExposureSet = 0;

    // Fetch all buyers with a trust score record in batches
    let cursor: string | undefined;

    while (true) {
      const batch = await (this.prisma as any).order_CODTrustScore.findMany({
        take: this.BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: { id: true, buyerId: true },
      });

      if (batch.length === 0) break;

      cursor = batch[batch.length - 1].id;

      for (const { buyerId } of batch) {
        const { lifetimeCODValue, activeExposure } = await this.computeForBuyer(buyerId);

        if (dryRun) {
          logger.debug('[CODTrustBackfill] DRY RUN — would update', {
            buyerId,
            lifetimeCODValue,
            activeExposure,
          });
        } else {
          await (this.prisma as any).order_CODTrustScore.updateMany({
            where: { buyerId },
            data: {
              lifetimeCODValue: BigInt(Math.round(lifetimeCODValue)),
              activeExposure: BigInt(Math.round(activeExposure)),
            },
          });
        }

        totalLifetimeSet += lifetimeCODValue;
        totalActiveExposureSet += activeExposure;
        totalBuyers++;
      }

      // Brief pause between batches to avoid DB contention
      if (batch.length === this.BATCH_SIZE) {
        await this.sleep(this.BATCH_SLEEP_MS);
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info('[CODTrustBackfill] Backfill complete', {
      dryRun,
      totalBuyers,
      totalLifetimeCODValueSet: totalLifetimeSet,
      totalActiveExposureSet,
      durationMs,
    });
  }

  private async computeForBuyer(
    buyerId: string,
  ): Promise<{ lifetimeCODValue: number; activeExposure: number }> {
    // Fetch all COD orders for this buyer
    const orders = await (this.prisma as any).order_Order.findMany({
      where: {
        buyerId,
        OR: [{ paymentMethod: 'COD' }, { paymentMethod: 'cod' }],
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
      },
    });

    let lifetimeCODValue = 0;
    let activeExposure = 0;

    for (const order of orders) {
      const amount = this.extractAmount(order.totalAmount);
      const status = String(order.status ?? '');

      if (this.TERMINAL_STATUSES.includes(status) && status.toLowerCase() === 'delivered') {
        // Delivered orders count toward lifetime value
        // Check if there's a dispute window record that's suspended (disputed delivery)
        const disputeWindow = await (this.prisma as any).order_CODDisputeWindow.findUnique({
          where: { orderId: order.id },
          select: { suspended: true },
        });

        if (!disputeWindow?.suspended) {
          lifetimeCODValue += amount;
        }
      } else if (this.ACTIVE_STATUSES.includes(status)) {
        // Active orders count toward exposure
        activeExposure += amount;
      }
    }

    return { lifetimeCODValue, activeExposure };
  }

  private extractAmount(totalAmount: any): number {
    if (typeof totalAmount?.amount === 'number') return totalAmount.amount;
    if (typeof totalAmount === 'object' && totalAmount !== null) {
      const val = totalAmount.amount ?? totalAmount.value ?? 0;
      return Number(val);
    }
    return Number(totalAmount ?? 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * CLI entry point — run directly with:
 *   COD_BACKFILL_DRY_RUN=true npx ts-node src/infrastructure/jobs/cod-trust-backfill.job.ts
 */
if (require.main === module) {
  const dryRun = process.env.COD_BACKFILL_DRY_RUN !== 'false';
  const { loadDatabaseConfig } = require('../../config/database.config');

  databaseManager
    .initialize(loadDatabaseConfig())
    .then(async () => {
      const job = new CODTrustBackfillJob();
      await job.run(dryRun);
      process.exit(0);
    })
    .catch((err: Error) => {
      logger.error('[CODTrustBackfill] Fatal error', { error: err.message });
      process.exit(1);
    });
}
