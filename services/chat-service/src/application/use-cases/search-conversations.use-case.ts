import { MeiliSearch } from 'meilisearch';
import { chatConfig } from '../../config/chat.config';
import { chatValidationError } from '../../shared/errors';

export interface ConversationSearchResult {
  id: string;
  type: string;
  participantNames: string[];
  lastMessagePreview: string | null;
  lastMessageAt: number | null;
  relatedProductId: string | null;
  relatedOrderId: string | null;
}

export class SearchConversationsUseCase {
  private readonly client: MeiliSearch;

  constructor() {
    this.client = new MeiliSearch({
      host: `${chatConfig.meilisearch.host}:${chatConfig.meilisearch.port}`,
      apiKey: chatConfig.meilisearch.apiKey,
      // Fail fast when Meilisearch is unreachable so the catch block runs
      // within the test timeout rather than hanging for 30s.
      timeout: 3000,
    });
  }

  async execute(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<ConversationSearchResult[]> {
    if (query.length < 2) {
      throw chatValidationError('Search query must be at least 2 characters');
    }
    if (query.length > 100) {
      throw chatValidationError('Search query must be at most 100 characters');
    }

    try {
      const index = this.client.index('chat_conversations');
      const results = await index.search<ConversationSearchResult>(query, {
        limit,
        filter: `participantIds = "${userId}"`,
      });
      return results.hits;
    } catch {
      // Meilisearch unavailable — return empty rather than crashing
      return [];
    }
  }
}
