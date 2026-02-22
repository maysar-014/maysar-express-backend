import { SellerMetricsCalculationJob } from './SellerMetricsCalculationJob';

export class MetricsScheduler {
  private job: SellerMetricsCalculationJob;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.job = new SellerMetricsCalculationJob();
  }

  start(intervalMinutes: number = 15) {
    if (this.intervalId) {
      console.log('[MetricsScheduler] Already running');
      return;
    }

    console.log(`[MetricsScheduler] Starting with ${intervalMinutes} minute interval`);
    
    // Run immediately on start
    this.job.execute().catch(error => {
      console.error('[MetricsScheduler] Initial run failed:', error);
    });

    // Schedule recurring execution
    this.intervalId = setInterval(() => {
      this.job.execute().catch(error => {
        console.error('[MetricsScheduler] Scheduled run failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[MetricsScheduler] Stopped');
    }
  }
}
