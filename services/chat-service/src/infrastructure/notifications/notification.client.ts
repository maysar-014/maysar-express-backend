import axios from 'axios';
import type { Message } from '../../domain/entities/message.entity';
import type { ConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import type { RedisPresenceStore } from '../redis/presence.store';
import { chatConfig } from '../../config/chat.config';
import { ServiceLogger } from '../../../../../shared/logger/logger';

const logger = new ServiceLogger('NotificationClient', 'chat-service');

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  IMAGE: '📷 Sent an image',
  VOICE_NOTE: '🎤 Sent a voice note',
  PRODUCT_CARD: '🛍️ Sent a product',
  ORDER_REFERENCE: '📦 Shared an order',
  LOCATION_PIN: '📍 Shared a location',
  QUICK_ACTION: '⚡ Sent a quick action',
};

export class NotificationClient {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly presence: RedisPresenceStore,
  ) {}

  async notifyOfflineParticipants(
    message: Message,
    conversationId: string,
  ): Promise<void> {
    const participants = await this.conversationRepo.getParticipants(conversationId);

    for (const participant of participants) {
      // Skip sender
      if (participant.userId === message.senderId) continue;

      // Skip muted
      if (participant.isMuted) continue;

      // Skip online users
      const online = await this.presence.isOnline(participant.userId);
      if (online) continue;

      const preview = this.buildPreview(message);

      try {
        await this.sendNotification(participant.userId, message, conversationId, preview);
      } catch (err) {
        logger.warn('Failed to send notification', {
          userId: participant.userId,
          messageId: message.id,
          err,
        });
      }
    }
  }

  private buildPreview(message: Message): string {
    if (message.content) {
      return message.content.slice(0, 80);
    }
    return MESSAGE_TYPE_LABELS[message.type] ?? message.type;
  }

  private async sendNotification(
    userId: string,
    message: Message,
    conversationId: string,
    preview: string,
  ): Promise<void> {
    // Determine fallback channels based on message type
    const channels =
      message.type === 'TEXT' || message.type === 'VOICE_NOTE'
        ? ['PUSH', 'SMS', 'EMAIL']
        : ['PUSH', 'EMAIL'];

    await axios.post(
      chatConfig.notification.serviceUrl,
      {
        userId,
        type: 'CHAT_MESSAGE',
        priority: 'HIGH',
        channels,
        data: {
          messageId: message.id,
          conversationId,
          preview,
          deepLink: `/chat/${conversationId}`,
        },
      },
      {
        headers: {
          'x-service-key': chatConfig.notification.serviceKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      },
    );
  }
}
