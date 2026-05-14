import type { ConversationRepository, PaginatedConversations, PaginationOptions } from '../../domain/repositories/conversation.repository.interface';
import { chatValidationError } from '../../shared/errors';

export class GetConversationListUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(
    userId: string,
    limit = 20,
    cursor?: string,
  ): Promise<PaginatedConversations> {
    const clampedLimit = Math.min(Math.max(1, limit), 50);
    const options: PaginationOptions = { limit: clampedLimit, cursor };
    return this.conversationRepo.findByParticipant(userId, options);
  }
}
