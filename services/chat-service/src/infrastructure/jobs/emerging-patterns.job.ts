/**
 * Emerging-pattern mining job.
 *
 * Runs hourly: mines recurring n-grams from recent flagged/blocked messages and
 * records qualifying ones as PENDING emerging patterns. Admins then review them
 * via the moderation dashboard (/admin/moderation/patterns) and can promote the
 * real ones into active suspicious phrases — keeping protection current as scam
 * language evolves, beyond the predefined seed list.
 */
import cron from "node-cron";
import type { PrismaClient } from "@prisma/client";
import { ServiceLogger } from "../../../../../shared/logger/logger";
import { EmergingPatternMiner } from "../../domain/risk/pattern-miner";

const logger = new ServiceLogger("EmergingPatternsJob", "chat-service");

export class EmergingPatternsJob {
  private task: cron.ScheduledTask | null = null;
  private readonly miner: EmergingPatternMiner;

  constructor(prisma: PrismaClient) {
    this.miner = new EmergingPatternMiner(prisma);
  }

  start(): void {
    // Run hourly at :15
    this.task = cron.schedule("15 * * * *", () => {
      void this.run();
    });
    logger.info("EmergingPatternsJob started (hourly at :15)");
  }

  stop(): void {
    this.task?.stop();
    logger.info("EmergingPatternsJob stopped");
  }

  async run(): Promise<number> {
    try {
      const scanned = await this.miner.run();
      logger.info("EmergingPatternsJob completed", { scanned });
      return scanned;
    } catch (err) {
      logger.warn("EmergingPatternsJob run failed", { err });
      return 0;
    }
  }
}
