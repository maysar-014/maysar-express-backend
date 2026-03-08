import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';
import { SellerMetricsCalculationJob } from './SellerMetricsCalculationJob';

export class MetricsScheduler {
  private job: SellerMetricsCalculationJob;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.job = new SellerMetricsCalculationJob();
  }

  start(intervalMinutes: number = 15) {
    if (this.intervalId) {
      logger.info('[MetricsScheduler] Already running');
      return;
    }

    logger.info(`[MetricsScheduler] Starting with ${intervalMinutes} minute interval`);
    
    // Run immediately on start
    this.job.execute().catch(error => {
      logger.error('[MetricsScheduler] Initial run failed:', error);
    });

    // Schedule recurring execution
    this.intervalId = setInterval(() => {
      this.job.execute().catch(error => {
        logger.error('[MetricsScheduler] Scheduled run failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[MetricsScheduler] Stopped');
    }
  }
}
