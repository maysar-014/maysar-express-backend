import { MarkOrdersOverdueUseCase } from '../../application/use-cases/mark-orders-overdue.use-case';
import { logger } from '../monitoring/logger';

/**
 * VerificationTimeoutJob
 *
 * In-process polling job that detects orders whose seller verification deadline
 * has passed and transitions them to VERIFICATION_OVERDUE status.
 *
 * Polling interval: 2 minutes (120 seconds).
 * Max escalation latency: 32 minutes from order placement (30 min window + 2 min poll).
 * Requirement 7.5: "within 35 minutes of order placement" — satisfied.
 */
export class VerificationTimeoutJob {
  private static readonly POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly markOrdersOverdueUseCase: MarkOrdersOverdueUseCase,
  ) {}

  start(): void {
    if (this.timer) return; // already running

    logger.info('[VerificationTimeoutJob] Starting — polling every 2 minutes');

    // Fire immediately on start, then on interval
    void this.tick();
    this.timer = setInterval(() => { void this.tick(); }, VerificationTimeoutJob.POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      logger.info('[VerificationTimeoutJob] Stopped');
    }
  }

  private async tick(): Promise<void> {
    if (this.running) {
      // Skip if previous tick is still in-flight (defensive)
      return;
    }
    this.running = true;
    try {
      const result = await this.markOrdersOverdueUseCase.execute();
      if (result.processedCount > 0) {
        logger.info('[VerificationTimeoutJob] Overdue orders processed', { count: result.processedCount });
      }
    } catch (err: any) {
      logger.error('[VerificationTimeoutJob] tick failed', { err: err.message });
    } finally {
      this.running = false;
    }
  }
}
