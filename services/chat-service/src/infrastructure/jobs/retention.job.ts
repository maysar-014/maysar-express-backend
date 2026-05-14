/**
 * Message Retention Job
 *
 * Runs daily at 02:00 UTC via node-cron.
 * - Hard-deletes soft-deleted messages older than 365 days (unless dispute evidence)
 * - Removes DISPUTE_EVIDENCE flag from messages in resolved disputes after 90-day grace period
 *
 * Requirements: 19.1, 19.2, 19.3
 */
import cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('RetentionJob', 'chat-service');

const RETENTION_DAYS = 365;
const DISPUTE_GRACE_DAYS = 90;

export class RetentionJob {
  private task: cron.ScheduledTask | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  start(): void {
    // Run daily at 02:00 UTC
    this.task = cron.schedule('0 2 * * *', () => {
      void this.run();
    });
    logger.info('RetentionJob started (daily at 02:00 UTC)');
  }

  stop(): void {
    this.task?.stop();
    logger.info('RetentionJob stopped');
  }

  async run(): Promise<void> {
    try {
      const [deleted, unflagged] = await Promise.all([
        this.purgeExpiredMessages(),
        this.clearResolvedDisputeFlags(),
      ]);
      logger.info('RetentionJob completed', { deleted, unflagged });
    } catch (err) {
      logger.warn('RetentionJob run failed', { err });
    }
  }

  // ─── Purge expired soft-deleted messages ───────────────────────────────────

  private async purgeExpiredMessages(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.prisma.chat_Message.deleteMany({
      where: {
        deletedAt: { not: null, lte: cutoff },
        isDisputeEvidence: false,
        createdAt: { lte: cutoff },
      },
    });

    if (result.count > 0) {
      logger.info(`Purged ${result.count} expired messages`);
    }
    return result.count;
  }

  // ─── Clear dispute evidence flags after grace period ──────────────────────

  private async clearResolvedDisputeFlags(): Promise<number> {
    const graceCutoff = new Date(Date.now() - DISPUTE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    // Find conversations linked to disputes resolved more than 90 days ago
    // We check Order_CODDispute for resolved status
    const resolvedConversations = await this.prisma.$queryRaw<Array<{ conversationId: string }>>`
      SELECT DISTINCT c.id AS "conversationId"
      FROM chat_conversations c
      JOIN "order_cod_disputes" d ON d."orderId" = c."relatedOrderId"
      WHERE
        d.status = 'RESOLVED'
        AND d."resolvedAt" IS NOT NULL
        AND d."resolvedAt" <= ${graceCutoff}
        AND c."relatedOrderId" IS NOT NULL
    `;

    if (resolvedConversations.length === 0) return 0;

    const conversationIds = resolvedConversations.map((r) => r.conversationId);

    const result = await this.prisma.chat_Message.updateMany({
      where: {
        conversationId: { in: conversationIds },
        isDisputeEvidence: true,
      },
      data: { isDisputeEvidence: false },
    });

    if (result.count > 0) {
      logger.info(`Cleared dispute evidence flag from ${result.count} messages`);
    }
    return result.count;
  }
}
