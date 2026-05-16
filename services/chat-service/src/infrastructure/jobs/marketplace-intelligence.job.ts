/**
 * Marketplace Intelligence Job
 *
 * Runs every hour via node-cron.
 * Emits anonymised demand and supplier-risk signals to the analytics pipeline.
 * No PII is included in any event payload.
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */
import cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('MarketplaceIntelligenceJob', 'chat-service');

export class MarketplaceIntelligenceJob {
  private task: cron.ScheduledTask | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  start(): void {
    // Run every hour at minute 0
    this.task = cron.schedule('0 * * * *', () => {
      void this.run();
    });
    logger.info('MarketplaceIntelligenceJob started (hourly)');
  }

  stop(): void {
    this.task?.stop();
    logger.info('MarketplaceIntelligenceJob stopped');
  }

  async run(): Promise<void> {
    try {
      await Promise.all([
        this.emitDemandSignals(),
        this.emitSupplierRiskSignals(),
      ]);
    } catch (err) {
      logger.warn('MarketplaceIntelligenceJob run failed', { err });
    }
  }

  // ─── Demand signals ────────────────────────────────────────────────────────
  // When >10 unique buyers ask about the same unavailable product in 24h,
  // emit a CHAT_DEMAND_SIGNAL event.

  private async emitDemandSignals(): Promise<void> {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find BUYER_SELLER conversations created in the last 24h for unavailable products
    const rows = await this.prisma.$queryRaw<Array<{ productId: string; buyerCount: bigint }>>`
      SELECT
        c."relatedProductId" AS "productId",
        COUNT(DISTINCT p."userId") AS "buyerCount"
      FROM chat_conversations c
      JOIN chat_conversation_participants p ON p."conversationId" = c.id AND p.role = 'BUYER'
      WHERE
        c.type = 'BUYER_SELLER'
        AND c."createdAt" >= ${windowStart}
        AND c.metadata->>'productUnavailable' = 'true'
        AND c."relatedProductId" IS NOT NULL
      GROUP BY c."relatedProductId"
      HAVING COUNT(DISTINCT p."userId") > 10
    `;

    for (const row of rows) {
      await this.emitAnalyticsEvent('CHAT_DEMAND_SIGNAL', {
        productId: row.productId,
        count: Number(row.buyerCount),
        windowStart: windowStart.toISOString(),
      });
    }

    if (rows.length > 0) {
      logger.info(`Emitted ${rows.length} CHAT_DEMAND_SIGNAL events`);
    }
  }

  // ─── Supplier risk signals ─────────────────────────────────────────────────
  // When a supplier is mentioned in >3 complaint messages in 7 days,
  // emit a CHAT_SUPPLIER_RISK_SIGNAL event.

  private async emitSupplierRiskSignals(): Promise<void> {
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Use a simple approach: find SELLER_SUPPLIER conversations with recent messages
    // containing complaint phrases, grouped by supplier participant
    const rows = await this.prisma.$queryRaw<Array<{ supplierId: string; complaintCount: bigint }>>`
      SELECT
        p."userId" AS "supplierId",
        COUNT(m.id) AS "complaintCount"
      FROM chat_messages m
      JOIN chat_conversations c ON c.id = m."conversationId"
      JOIN chat_conversation_participants p ON p."conversationId" = c.id AND p.role = 'SUPPLIER'
      WHERE
        m."createdAt" >= ${windowStart}
        AND m."deletedAt" IS NULL
        AND m.type = 'TEXT'
        AND m.content IS NOT NULL
        AND (
          LOWER(m.content) LIKE '%not delivered%'
          OR LOWER(m.content) LIKE '%late delivery%'
          OR LOWER(m.content) LIKE '%wrong item%'
          OR LOWER(m.content) LIKE '%damaged%'
          OR LOWER(m.content) LIKE '%never arrived%'
          OR LOWER(m.content) LIKE '%supplier problem%'
          OR LOWER(m.content) LIKE '%out of stock%'
          OR LOWER(m.content) LIKE '%no response%'
        )
      GROUP BY p."userId"
      HAVING COUNT(m.id) > 3
    `;

    for (const row of rows) {
      await this.emitAnalyticsEvent('CHAT_SUPPLIER_RISK_SIGNAL', {
        supplierId: row.supplierId,
        count: Number(row.complaintCount),
      });
    }

    if (rows.length > 0) {
      logger.info(`Emitted ${rows.length} CHAT_SUPPLIER_RISK_SIGNAL events`);
    }
  }

  // ─── Analytics event emission ──────────────────────────────────────────────

  private async emitAnalyticsEvent(
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Write to Analytics_Event table via outbox pattern — no PII in payload
    await this.prisma.analytics_Event.create({
      data: {
        type,
        data: data as never,
        timestamp: new Date(),
        status: 'PENDING',
      },
    });
  }
}
