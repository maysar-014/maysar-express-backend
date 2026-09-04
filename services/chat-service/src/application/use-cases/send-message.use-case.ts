import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { MessageRepository, CreateMessageInput } from '../../domain/repositories/message.repository.interface';
import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type { RedisRateLimiter } from '../../infrastructure/redis/rate-limiter';
import type { RedisPubSub } from '../../infrastructure/redis/pubsub';
import type { RiskEngine } from '../../domain/risk/risk-engine';
import type { Message, MessageType, QuickActionType } from '../../domain/entities/message.entity';
import {
  chatAccessDenied,
  chatConversationArchived,
  chatMessageRateLimitExceeded,
  chatRecipientBlocked,
  chatValidationError,
  chatInvalidProductReference,
  chatOrderAccessDenied,
} from '../../shared/errors';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string | null;
  metadata?: Record<string, unknown>;
}

// Minimal catalog/order client interfaces — resolved at runtime via HTTP or shared Prisma
export interface CatalogClient {
  getProductSnapshot(productId: string): Promise<Record<string, unknown> | null>;
}

export interface OrderClient {
  getOrderSnapshot(orderId: string, userId: string): Promise<Record<string, unknown> | null>;
}

export class SendMessageUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly moderationRepo: ModerationRepository,
    private readonly rateLimiter: RedisRateLimiter,
    private readonly pubSub: RedisPubSub,
    private readonly riskEngine: RiskEngine,
    private readonly catalogClient: CatalogClient,
    private readonly orderClient: OrderClient,
    private readonly notifyOffline: (message: Message, conversationId: string) => Promise<void>,
  ) {}

  async execute(input: SendMessageInput): Promise<Message> {
    const { conversationId, senderId, type, content } = input;

    // 1. Participant check
    const isMember = await this.conversationRepo.isParticipant(conversationId, senderId);
    if (!isMember) throw chatAccessDenied();

    // 2. Archived check
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) throw chatAccessDenied();
    if (conversation.moderationStatus === 'ARCHIVED') throw chatConversationArchived();

    // 3. Message rate limit
    const { allowed } = await this.rateLimiter.checkMessageLimit(senderId);
    if (!allowed) throw chatMessageRateLimitExceeded();

    // 4. Block check — check if any other participant has blocked sender
    const participants = await this.conversationRepo.getParticipants(conversationId);
    const others = participants.filter((p) => p.userId !== senderId);
    for (const other of others) {
      const blocked = await this.moderationRepo.isBlocked(other.userId, senderId);
      if (blocked) throw chatRecipientBlocked();
    }

    // 5. Validate payload by type
    const metadata = await this.buildMetadata(input);

    // 6. Risk Engine
    const messagesLast5Min = await this.riskEngine.getMessagesLast5Min(senderId);
    const sameContentConversations = await this.riskEngine.getSameContentConversationCount(
      senderId,
      content ?? null,
    );
    const { score, signals } = await this.riskEngine.computeSpamScore(content ?? null, {
      userId: senderId,
      messagesLast5Min,
      sameContentConversations,
    });

    let moderationStatus: 'ACTIVE' | 'FLAGGED' | 'BLOCKED' = 'ACTIVE';
    if (score >= 90) moderationStatus = 'BLOCKED';
    else if (score >= 70) moderationStatus = 'FLAGGED';

    // 7. Persist message
    const createInput: CreateMessageInput = {
      conversationId,
      senderId,
      type,
      content: content ?? null,
      metadata,
      moderationStatus,
      spamScore: score,
    };

    const message = await this.messageRepo.create(createInput);

    // Log spam score if non-zero
    if (score > 0) {
      // Fire-and-forget spam log (non-blocking)
      void this.logSpamScore(message.id, score, signals);
    }

    // 8. Update conversation lastMessageAt
    await this.conversationRepo.updateLastMessageAt(conversationId, message.createdAt);

    // 9. Track frequency for risk engine
    await this.riskEngine.incrementMessageFrequency(senderId);
    if (content) await this.riskEngine.recordMessageSent(senderId, content);

    // 10. If blocked, do not deliver — return early
    if (moderationStatus === 'BLOCKED') {
      return message;
    }

    // 11. Publish to Redis for WebSocket fan-out
    await this.pubSub.publish(conversationId, {
      type: 'message',
      data: message,
    });

    // 12. Notify offline participants (fire-and-forget)
    void this.notifyOffline(message, conversationId);

    return message;
  }

  private async buildMetadata(input: SendMessageInput): Promise<Record<string, unknown>> {
    const { type, content, metadata = {} } = input;

    switch (type) {
      case 'TEXT': {
        if (!content || content.length < 1 || content.length > 4000) {
          throw chatValidationError('Text message must be between 1 and 4000 characters');
        }
        return metadata;
      }

      case 'IMAGE': {
        if (!metadata.mediaUrl) {
          throw chatValidationError('IMAGE message requires metadata.mediaUrl');
        }
        return metadata;
      }

      case 'VOICE_NOTE': {
        if (!metadata.mediaUrl) {
          throw chatValidationError('VOICE_NOTE message requires metadata.mediaUrl');
        }
        if (typeof metadata.durationSeconds !== 'number') {
          throw chatValidationError('VOICE_NOTE message requires metadata.durationSeconds');
        }
        return metadata;
      }

      case 'PRODUCT_CARD': {
        const productId = metadata.productId as string | undefined;
        if (!productId) throw chatValidationError('PRODUCT_CARD requires metadata.productId');
        const snapshot = await this.catalogClient.getProductSnapshot(productId);
        if (!snapshot) throw chatInvalidProductReference();
        return { ...metadata, ...snapshot, productId };
      }

      case 'ORDER_REFERENCE': {
        const orderId = metadata.orderId as string | undefined;
        if (!orderId) throw chatValidationError('ORDER_REFERENCE requires metadata.orderId');
        const snapshot = await this.orderClient.getOrderSnapshot(orderId, input.senderId);
        if (!snapshot) throw chatOrderAccessDenied();
        return { ...metadata, ...snapshot, orderId };
      }

      case 'ORDER_CARD': {
        // System-generated order card — carries full order details + action button.
        // orderId is required; other fields (items, total, actionType) come from metadata.
        const orderId = metadata.orderId as string | undefined;
        if (!orderId) throw chatValidationError('ORDER_CARD requires metadata.orderId');
        // Fetch snapshot for authorization — sender must be buyer or seller for this order
        const snapshot = await this.orderClient.getOrderSnapshot(orderId, input.senderId);
        if (!snapshot) throw chatOrderAccessDenied();
        return { ...metadata, ...snapshot, orderId };
      }

      case 'LOCATION_PIN': {
        const lat = metadata.latitude as number | undefined;
        const lng = metadata.longitude as number | undefined;
        if (lat === undefined || lng === undefined) {
          throw chatValidationError('LOCATION_PIN requires metadata.latitude and metadata.longitude');
        }
        if (lat < -90 || lat > 90) throw chatValidationError('latitude must be in range [-90, 90]');
        if (lng < -180 || lng > 180) throw chatValidationError('longitude must be in range [-180, 180]');
        const label = metadata.label as string | undefined;
        if (label && label.length > 200) throw chatValidationError('location label must be ≤ 200 characters');
        return metadata;
      }

      case 'QUICK_ACTION': {
        const validActions: QuickActionType[] = [
          'CONFIRM_AVAILABILITY',
          'REQUEST_QUOTE',
          'TRACK_ORDER',
          'ACCEPT_OFFER',
          'DECLINE_OFFER',
          'CONFIRM_ORDER',
          'DECLINE_ORDER',
        ];
        const actionType = metadata.actionType as string | undefined;
        if (!actionType || !validActions.includes(actionType as QuickActionType)) {
          throw chatValidationError(
            `actionType must be one of: ${validActions.join(', ')}`,
          );
        }
        return metadata;
      }

      default:
        return metadata;
    }
  }

  private async logSpamScore(
    messageId: string,
    score: number,
    signals: Record<string, number>,
  ): Promise<void> {
    // Spam score logging is handled by the infrastructure layer via the message record
    // This is a no-op placeholder — the score is already persisted on the message row
    void messageId;
    void score;
    void signals;
  }
}
