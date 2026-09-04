/**
 * OrderChatHandler
 *
 * Handles order lifecycle events and creates the corresponding structured
 * chat messages (ORDER_CARD) in the buyer↔seller conversation.
 *
 * Responsibilities:
 *   order.pending_seller_verification  → create/find BUYER_SELLER conversation
 *                                        → post ORDER_CARD to seller (with CONFIRM_ORDER action)
 *                                        → post confirmation text to buyer
 *   order.seller_verified              → update the ORDER_CARD status in the conversation
 *                                        → post a text message to the buyer
 *   order.seller_declined              → post a declined status message to the buyer
 *
 * Idempotency:
 *   Each event carries a stable orderId.  Before creating a message we check
 *   whether a chat_Message with metadata.orderId === orderId AND
 *   metadata.eventType === <type> already exists in the conversation.
 *   If it does, we skip creation (safe retry).
 */

import { ServiceLogger } from '../../../../../shared/logger/logger';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import type { RedisPubSub } from '../redis/pubsub';
import { makeId } from '../../../../../shared/ids/id';

const logger = new ServiceLogger('OrderChatHandler', 'chat-service');

interface OrderChatHandlerDeps {
  prisma: PrismaClientType;
  pubSub: RedisPubSub | null;
}

export class OrderChatHandler {
  constructor(private readonly deps: OrderChatHandlerDeps) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Public handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Called when order.pending_seller_verification fires.
   * Creates (or reuses) a BUYER_SELLER conversation for the order and posts
   * an ORDER_CARD message to the seller containing the Confirm Order action.
   * Also posts a "Your order has been placed" text to the buyer.
   */
  async handleOrderPlaced(payload: {
    orderId: string;
    buyerId: string;
    sellerId: string;
    items?: Array<{ productId: string; quantity: number; price?: { amount: number; currency: string } }>;
    verificationDeadlineAt?: string;
    trackingNumber?: string;
  }): Promise<void> {
    const { orderId, buyerId, sellerId, items = [], verificationDeadlineAt, trackingNumber } = payload;

    try {
      const { prisma, pubSub } = this.deps;

      // 1. Find or create a BUYER_SELLER conversation linked to this order
      const conversation = await this.findOrCreateOrderConversation(buyerId, sellerId, orderId);

      // 2. Idempotency check — skip if ORDER_CARD for this order already exists
      const existing = await (prisma as any).chat_Message?.findFirst?.({
        where: {
          conversationId: conversation.id,
          type: 'ORDER_CARD',
          // Prisma JSON path filter
          metadata: { path: ['orderId'], equals: orderId },
        },
      }).catch(() => null);

      if (existing) {
        logger.info('[OrderChat] ORDER_CARD already exists, skipping', { orderId });
        return;
      }

      // 3. Build the order summary for display
      const itemSummary = items
        .slice(0, 3)
        .map((i) => `• ${i.quantity}x ${i.productId}`)
        .join('\n');
      const moreItems = items.length > 3 ? `\n+ ${items.length - 3} more items` : '';
      const totalAmount = items.reduce((sum, i) => {
        const price = typeof i.price === 'object' ? i.price.amount : 0;
        return sum + price * i.quantity;
      }, 0);
      const currency = items[0]?.price?.currency ?? 'TZS';

      // 4. Post ORDER_CARD to seller — contains CONFIRM_ORDER action
      const sellerCardId = makeId('msg');
      await this.createMessage({
        id: sellerCardId,
        conversationId: conversation.id,
        senderId: buyerId, // card is from buyer's perspective
        type: 'ORDER_CARD',
        content: null,
        metadata: {
          orderId,
          trackingNumber: trackingNumber ?? orderId,
          eventType: 'ORDER_PLACED',
          status: 'PENDING_SELLER_VERIFICATION',
          items,
          totalAmount,
          currency,
          itemSummary: itemSummary + moreItems,
          verificationDeadlineAt,
          // Action button for the seller
          actionType: 'CONFIRM_ORDER',
          actionLabel: 'Confirm Order',
          actionEndpoint: `/api/order/orders/${orderId}/verify`,
          actionMethod: 'POST',
          // Secondary action
          secondaryActionType: 'DECLINE_ORDER',
          secondaryActionLabel: 'Decline',
          secondaryActionEndpoint: `/api/order/orders/${orderId}/decline`,
          secondaryActionMethod: 'POST',
        },
      });

      // 5. Post a text confirmation to the buyer
      await this.createMessage({
        id: makeId('msg'),
        conversationId: conversation.id,
        senderId: 'system',
        type: 'TEXT',
        content: `✅ Your order has been placed successfully! (${trackingNumber ?? orderId})\nThe seller will confirm stock shortly.`,
        metadata: { orderId, eventType: 'ORDER_PLACED_BUYER_CONFIRM', isSystemMessage: true },
      });

      // 6. Publish WebSocket events
      if (pubSub) {
        await pubSub.publish(conversation.id, { type: 'order.placed', orderId }).catch(() => {});
      }

      logger.info('[OrderChat] ORDER_CARD created for order', { orderId, conversationId: conversation.id });
    } catch (err: any) {
      logger.warn('[OrderChat] handleOrderPlaced failed (non-fatal)', { orderId, err: err?.message });
    }
  }

  /**
   * Called when order.seller_verified fires.
   * Posts a confirmation message to both parties in the existing conversation.
   */
  async handleOrderVerified(payload: {
    orderId: string;
    buyerId: string;
    sellerId: string;
  }): Promise<void> {
    const { orderId, buyerId, sellerId } = payload;

    try {
      const { prisma, pubSub } = this.deps;

      const conversation = await this.findExistingOrderConversation(buyerId, sellerId, orderId);
      if (!conversation) {
        logger.warn('[OrderChat] No conversation found for seller_verified', { orderId });
        return;
      }

      // Idempotency
      const existing = await (prisma as any).chat_Message?.findFirst?.({
        where: {
          conversationId: conversation.id,
          metadata: { path: ['eventType'], equals: 'ORDER_VERIFIED' },
        },
      }).catch(() => null);

      if (existing) {
        logger.info('[OrderChat] ORDER_VERIFIED message already exists, skipping', { orderId });
        return;
      }

      // Post confirmation status message
      await this.createMessage({
        id: makeId('msg'),
        conversationId: conversation.id,
        senderId: sellerId,
        type: 'TEXT',
        content: `✅ Order ${orderId} confirmed! The seller has verified stock. You can now proceed to checkout.`,
        metadata: { orderId, eventType: 'ORDER_VERIFIED', isSystemMessage: false },
      });

      if (pubSub) {
        await pubSub.publish(conversation.id, { type: 'order.verified', orderId }).catch(() => {});
      }

      logger.info('[OrderChat] ORDER_VERIFIED message posted', { orderId });
    } catch (err: any) {
      logger.warn('[OrderChat] handleOrderVerified failed (non-fatal)', { orderId, err: err?.message });
    }
  }

  /**
   * Called when order.seller_declined fires.
   */
  async handleOrderDeclined(payload: {
    orderId: string;
    buyerId: string;
    sellerId: string;
    reason?: string;
  }): Promise<void> {
    const { orderId, buyerId, sellerId, reason } = payload;

    try {
      const { pubSub } = this.deps;

      const conversation = await this.findExistingOrderConversation(buyerId, sellerId, orderId);
      if (!conversation) return;

      await this.createMessage({
        id: makeId('msg'),
        conversationId: conversation.id,
        senderId: sellerId,
        type: 'TEXT',
        content: `❌ Order ${orderId} could not be fulfilled. ${reason ? `Reason: ${reason}` : 'The seller was unable to confirm stock.'}`,
        metadata: { orderId, eventType: 'ORDER_DECLINED', reason, isSystemMessage: false },
      });

      if (pubSub) {
        await pubSub.publish(conversation.id, { type: 'order.declined', orderId }).catch(() => {});
      }
    } catch (err: any) {
      logger.warn('[OrderChat] handleOrderDeclined failed (non-fatal)', { orderId, err: err?.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async findOrCreateOrderConversation(
    buyerId: string,
    sellerId: string,
    orderId: string,
  ): Promise<{ id: string }> {
    const { prisma } = this.deps;

    // Try to find an existing conversation for this order
    const existing = await this.findExistingOrderConversation(buyerId, sellerId, orderId);
    if (existing) return existing;

    // Create new BUYER_SELLER conversation linked to the order
    const conversationId = makeId('conv');
    const now = new Date();

    await (prisma as any).chat_Conversation?.create?.({
      data: {
        id: conversationId,
        type: 'BUYER_SELLER',
        relatedOrderId: orderId,
        moderationStatus: 'ACTIVE',
        metadata: { createdByOrderEvent: true, orderId },
        lastMessageAt: now,
        createdAt: now,
        participants: {
          create: [
            { userId: buyerId, role: 'BUYER', joinedAt: now },
            { userId: sellerId, role: 'SELLER', joinedAt: now },
          ],
        },
      },
    });

    logger.info('[OrderChat] Created conversation for order', { orderId, conversationId });
    return { id: conversationId };
  }

  private async findExistingOrderConversation(
    buyerId: string,
    sellerId: string,
    orderId: string,
  ): Promise<{ id: string } | null> {
    const { prisma } = this.deps;

    try {
      // Look for conversation where relatedOrderId matches
      const conv = await (prisma as any).chat_Conversation?.findFirst?.({
        where: {
          relatedOrderId: orderId,
          type: 'BUYER_SELLER',
          participants: {
            some: { userId: buyerId },
          },
        },
        select: { id: true },
      });

      if (conv) return conv;

      // Fallback: find any BUYER_SELLER conversation between these two users for this order
      const convByParticipants = await (prisma as any).chat_Conversation?.findFirst?.({
        where: {
          type: 'BUYER_SELLER',
          relatedOrderId: orderId,
          AND: [
            { participants: { some: { userId: buyerId } } },
            { participants: { some: { userId: sellerId } } },
          ],
        },
        select: { id: true },
      });

      return convByParticipants ?? null;
    } catch {
      return null;
    }
  }

  private async createMessage(params: {
    id: string;
    conversationId: string;
    senderId: string;
    type: string;
    content: string | null;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const { prisma, pubSub } = this.deps;
    const now = new Date();

    const message = await (prisma as any).chat_Message?.create?.({
      data: {
        id: params.id,
        conversationId: params.conversationId,
        senderId: params.senderId,
        type: params.type,
        content: params.content,
        metadata: params.metadata,
        moderationStatus: 'ACTIVE',
        spamScore: 0,
        isDisputeEvidence: false,
        deletedAt: null,
        createdAt: now,
      },
    });

    // Update conversation lastMessageAt
    await (prisma as any).chat_Conversation?.update?.({
      where: { id: params.conversationId },
      data: { lastMessageAt: now },
    }).catch(() => {});

    // Publish to WebSocket subscribers
    if (pubSub && message) {
      await pubSub.publish(params.conversationId, {
        type: 'message',
        data: message,
      }).catch(() => {});
    }
  }
}
