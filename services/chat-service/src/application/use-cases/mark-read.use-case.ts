import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { RedisPubSub } from '../../infrastructure/redis/pubsub';
import { chatAccessDenied } from '../../shared/errors';

export class MarkReadUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly pubSub: RedisPubSub,
  ) {}

  async execute(conversationId: string, userId: string): Promise<void> {
    const isMember = await this.conversationRepo.isParticipant(conversationId, userId);
    if (!isMember) throw chatAccessDenied();

    const now = new Date();
    await this.conversationRepo.updateLastReadAt(conversationId, userId, now);

    // Broadcast read receipt to other participants
    await this.pubSub.publish(conversationId, {
      type: 'read_receipt',
      data: { conversationId, userId, lastReadAt: now.toISOString() },
    });
  }
}
