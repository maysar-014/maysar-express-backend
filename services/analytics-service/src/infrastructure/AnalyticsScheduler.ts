import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';
import { SellerMetricsCalculationJob } from './SellerMetricsCalculationJob';
import { ActionCenterGenerationJob } from './ActionCenterGenerationJob';
import { CourierAnalyticsSyncJob } from './CourierAnalyticsSyncJob';
import { EnablerAnalyticsSyncJob } from './EnablerAnalyticsSyncJob';
import { SalesAnalyticsSyncJob } from './SalesAnalyticsSyncJob';

interface ScheduledTask {
  name: string;
  intervalMinutes: number;
  run: () => Promise<void>;
}

const MINUTE_MS = 60 * 1000;

const readInterval = (envVar: string, fallbackMinutes: number): number => {
  const raw = process.env[envVar];
  if (!raw) {
    return fallbackMinutes;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(`[AnalyticsScheduler] Ignoring invalid ${envVar}="${raw}"; using ${fallbackMinutes}m`);
    return fallbackMinutes;
  }

  return parsed;
};

/**
 * Owns every periodic analytics calculation/sync job and runs them on
 * configurable intervals.
 *
 * Historically these jobs existed but were never instantiated anywhere, so the
 * `Analytics_*` tables were only written when a dashboard endpoint happened to
 * be hit. This scheduler is started from the analytics module and stopped on
 * shutdown so the tables are populated continuously.
 */
export class AnalyticsScheduler {
  private readonly tasks: ScheduledTask[];
  private readonly intervalIds = new Map<string, NodeJS.Timeout>();
  private started = false;

  constructor() {
    this.tasks = [
      {
        name: 'SellerMetricsCalculationJob',
        intervalMinutes: readInterval('ANALYTICS_METRICS_INTERVAL_MINUTES', 15),
        run: () => new SellerMetricsCalculationJob().execute()
      },
      {
        name: 'ActionCenterGenerationJob',
        intervalMinutes: readInterval('ANALYTICS_ACTION_CENTER_INTERVAL_MINUTES', 60),
        run: () => new ActionCenterGenerationJob().execute()
      },
      {
        name: 'CourierAnalyticsSyncJob',
        intervalMinutes: readInterval('ANALYTICS_COURIER_SYNC_INTERVAL_MINUTES', 30),
        run: () => new CourierAnalyticsSyncJob().execute()
      },
      {
        name: 'EnablerAnalyticsSyncJob',
        intervalMinutes: readInterval('ANALYTICS_ENABLER_SYNC_INTERVAL_MINUTES', 30),
        run: () => new EnablerAnalyticsSyncJob().execute()
      },
      {
        name: 'SalesAnalyticsSyncJob',
        intervalMinutes: readInterval('ANALYTICS_SALES_SYNC_INTERVAL_MINUTES', 15),
        run: () => new SalesAnalyticsSyncJob().execute()
      }
    ];
  }

  start(): void {
    if (this.started) {
      logger.info('[AnalyticsScheduler] Already running');
      return;
    }
    this.started = true;

    for (const task of this.tasks) {
      logger.info(`[AnalyticsScheduler] Scheduling ${task.name} every ${task.intervalMinutes}m`);

      // Run immediately on start so the tables populate without waiting a cycle.
      task.run().catch(error => {
        logger.error(`[AnalyticsScheduler] Initial run of ${task.name} failed:`, error);
      });

      const intervalId = setInterval(() => {
        task.run().catch(error => {
          logger.error(`[AnalyticsScheduler] Scheduled run of ${task.name} failed:`, error);
        });
      }, task.intervalMinutes * MINUTE_MS);

      // Do not hold the process open just for analytics scheduling.
      intervalId.unref?.();
      this.intervalIds.set(task.name, intervalId);
    }
  }

  stop(): void {
    for (const [name, intervalId] of this.intervalIds.entries()) {
      clearInterval(intervalId);
      logger.info(`[AnalyticsScheduler] Stopped ${name}`);
    }
    this.intervalIds.clear();
    this.started = false;
  }
}