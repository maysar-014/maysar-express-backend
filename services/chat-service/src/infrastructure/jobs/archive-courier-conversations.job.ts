/**
 * Auto-Archive BUYER_COURIER Conversations Job
 *
 * Subscribes to order status change events via the shared event bus.
 * When an order reaches DELIVERED or CANCELLED, finds the associated
 * BUYER_COURIER conversation and sets moderationStatus = ARCHIVED.
 *
 * Requirements: 3.2, 3.3
 */
import type { PrismaClient } from '@prisma/client';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('ArchiveCourierConversationsJob', 'chat-service');

type OrderStatusChangedPayload = {
  orderId: string;
  status: string;
};

export class ArchiveCourierConversationsJob {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Handle an order status change event.
   * Called by the event bus subscriber in ChatModule.initialize().
   */
  async handleOrderStatusChanged(payload: OrderStatusChangedPayload): Promise<void> {
    const { orderId, status } = payload;

    if (status !== 'DELIVERED' && status !== 'CANCELLED') return;

    try {
      // Find the BUYER_COURIER conversation for this order
      const conversation = await this.prisma.chat_Conversation.findFirst({
        where: {
          type: 'BUYER_COURIER',
          relatedOrderId: orderId,
          moderationStatus: { not: 'ARCHIVED' },
        },
      });

      if (!conversation) return;

      await this.prisma.chat_Conversation.update({
        where: { id: conversation.id },
        data: { moderationStatus: 'ARCHIVED' },
      });

      logger.info('Archived BUYER_COURIER conversation', {
        conversationId: conversation.id,
        orderId,
        orderStatus: status,
      });
    } catch (err) {
      logger.warn('Failed to archive BUYER_COURIER conversation', { orderId, err });
    }
  }

  /**
   * Backfill: archive any BUYER_COURIER conversations for already-completed orders.
   * Run once on startup to catch any missed events.
   */
  async backfill(): Promise<void> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT c.id
        FROM chat_conversations c
        JOIN "orders" o ON o.id = c."relatedOrderId"
        WHERE
          c.type = 'BUYER_COURIER'
          AND c."moderationStatus" != 'ARCHIVED'
          AND o.status IN ('DELIVERED', 'CANCELLED')
      `;

      if (rows.length === 0) return;

      const ids = rows.map((r) => r.id);
      await this.prisma.chat_Conversation.updateMany({
        where: { id: { in: ids } },
        data: { moderationStatus: 'ARCHIVED' },
      });

      logger.info(`Backfilled ${ids.length} BUYER_COURIER conversations to ARCHIVED`);
    } catch (err) {
      logger.warn('ArchiveCourierConversationsJob backfill failed', { err });
    }
  }
}
