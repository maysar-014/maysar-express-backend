import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type { ModerationReport } from '../../domain/entities/moderation.entity';
import { chatAccessDenied } from '../../shared/errors';

export class ModerationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly moderationRepo: ModerationRepository,
  ) {}

  async reportMessage(
    reporterId: string,
    messageId: string,
    conversationId: string,
    reason: string,
  ): Promise<ModerationReport> {
    const isMember = await this.conversationRepo.isParticipant(conversationId, reporterId);
    if (!isMember) throw chatAccessDenied();

    return this.moderationRepo.createReport({
      reporterId,
      messageId,
      conversationId,
      reason,
    });
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.moderationRepo.blockUser(blockerId, blockedId);
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.moderationRepo.unblockUser(blockerId, blockedId);
  }

  async muteConversation(conversationId: string, userId: string): Promise<void> {
    const isMember = await this.conversationRepo.isParticipant(conversationId, userId);
    if (!isMember) throw chatAccessDenied();
    await this.conversationRepo.setMuted(conversationId, userId, true);
  }

  async unmuteConversation(conversationId: string, userId: string): Promise<void> {
    const isMember = await this.conversationRepo.isParticipant(conversationId, userId);
    if (!isMember) throw chatAccessDenied();
    await this.conversationRepo.setMuted(conversationId, userId, false);
  }
}
