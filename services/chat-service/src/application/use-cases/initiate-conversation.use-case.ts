import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { MessageRepository } from '../../domain/repositories/message.repository.interface';
import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type { RedisRateLimiter } from '../../infrastructure/redis/rate-limiter';
import type { RedisPubSub } from '../../infrastructure/redis/pubsub';
import type { Conversation } from '../../domain/entities/conversation.entity';
import type { ConversationType, ParticipantRole } from '../../domain/entities/conversation.entity';
import {
  chatRateLimitExceeded,
  chatRecipientBlocked,
  chatValidationError,
} from '../../shared/errors';

export interface InitiateConversationInput {
  initiatorId: string;
  initiatorRole: ParticipantRole;
  recipientId: string;
  recipientRole: ParticipantRole;
  type: ConversationType;
  relatedProductId?: string | null;
  relatedOrderId?: string | null;
  relatedShipmentId?: string | null;
  relatedSupplierRequestId?: string | null;
  metadata?: Record<string, unknown>;
}

export class InitiateConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly moderationRepo: ModerationRepository,
    private readonly rateLimiter: RedisRateLimiter,
    private readonly pubSub: RedisPubSub,
  ) {}

  async execute(input: InitiateConversationInput): Promise<Conversation> {
    const {
      initiatorId,
      initiatorRole,
      recipientId,
      recipientRole,
      type,
      relatedProductId,
    } = input;

    // 1. Self-chat guard
    if (initiatorId === recipientId) {
      throw chatValidationError('Cannot start a conversation with yourself');
    }

    // 2. Role validation
    this.validateRoles(type, initiatorRole, recipientRole);

    // 3. Dedup check for BUYER_SELLER
    if (type === 'BUYER_SELLER' && relatedProductId) {
      const existing = await this.conversationRepo.findExisting(
        initiatorId,
        recipientId,
        relatedProductId,
      );
      if (existing) return existing;
    }

    // 4. Rate limit
    const { allowed } = await this.rateLimiter.checkConversationLimit(initiatorId);
    if (!allowed) throw chatRateLimitExceeded();

    // 5. Block check
    const blocked = await this.moderationRepo.isBlockedEither(initiatorId, recipientId);
    if (blocked) throw chatRecipientBlocked();

    // 6. Create conversation + participants atomically
    const conversation = await this.conversationRepo.create({
      type,
      relatedProductId: input.relatedProductId ?? null,
      relatedOrderId: input.relatedOrderId ?? null,
      relatedShipmentId: input.relatedShipmentId ?? null,
      relatedSupplierRequestId: input.relatedSupplierRequestId ?? null,
      metadata: input.metadata ?? {},
      participants: [
        { userId: initiatorId, role: initiatorRole },
        { userId: recipientId, role: recipientRole },
      ],
    });

    // 7. Auto-send initial messages for BUYER_SELLER
    if (type === 'BUYER_SELLER') {
      // Product card first (if product linked)
      if (relatedProductId) {
        await this.messageRepo.create({
          conversationId: conversation.id,
          senderId: initiatorId,
          type: 'PRODUCT_CARD',
          metadata: { productId: relatedProductId },
        });
      }
      // Auto greeting
      await this.messageRepo.create({
        conversationId: conversation.id,
        senderId: initiatorId,
        type: 'TEXT',
        content: 'Hi, is this item still available?',
      });

      await this.conversationRepo.updateLastMessageAt(conversation.id, new Date());
    }

    // 8. Publish event
    await this.pubSub.publish(conversation.id, {
      type: 'conversation.created',
      conversationId: conversation.id,
    });

    return conversation;
  }

  private validateRoles(
    type: ConversationType,
    initiatorRole: ParticipantRole,
    recipientRole: ParticipantRole,
  ): void {
    if (type === 'SELLER_SUPPLIER') {
      if (initiatorRole !== 'SELLER') {
        throw chatValidationError('Only sellers can initiate supplier conversations');
      }
      if (recipientRole !== 'SUPPLIER') {
        throw chatValidationError('Recipient must be a supplier for this conversation type');
      }
    }
    if (type === 'BUYER_COURIER') {
      if (initiatorRole !== 'BUYER' && initiatorRole !== 'COURIER') {
        throw chatValidationError('Invalid role for buyer-courier conversation');
      }
    }
  }
}
