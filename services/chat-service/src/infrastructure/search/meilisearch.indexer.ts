import { MeiliSearch } from 'meilisearch';
import { chatConfig } from '../../config/chat.config';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('MeilisearchIndexer', 'chat-service');

export interface ChatConversationDocument {
  id: string;
  type: string;
  participantIds: string[];
  participantNames: string[];
  lastMessagePreview: string | null;
  lastMessageAt: number | null;
  relatedProductId: string | null;
  relatedOrderId: string | null;
}

export class MeilisearchIndexer {
  private readonly client: MeiliSearch;
  private readonly indexName = 'chat_conversations';

  constructor() {
    this.client = new MeiliSearch({
      host: `${chatConfig.meilisearch.host}:${chatConfig.meilisearch.port}`,
      apiKey: chatConfig.meilisearch.apiKey,
    });
  }

  async ensureIndex(): Promise<void> {
    try {
      const index = this.client.index(this.indexName);
      await index.updateSettings({
        searchableAttributes: ['participantNames', 'lastMessagePreview'],
        sortableAttributes: ['lastMessageAt'],
        filterableAttributes: ['participantIds'],
      });
    } catch (err) {
      logger.warn('Failed to configure Meilisearch index', { err });
    }
  }

  async indexConversation(doc: ChatConversationDocument): Promise<void> {
    try {
      const index = this.client.index(this.indexName);
      await index.addDocuments([doc], { primaryKey: 'id' });
    } catch (err) {
      logger.warn('Failed to index conversation', { conversationId: doc.id, err });
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const index = this.client.index(this.indexName);
      await index.deleteDocument(conversationId);
    } catch (err) {
      logger.warn('Failed to delete conversation from index', { conversationId, err });
    }
  }
}
