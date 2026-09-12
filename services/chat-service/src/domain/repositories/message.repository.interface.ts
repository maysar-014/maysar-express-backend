import type {
  Message,
  MessageModerationStatus,
} from "../entities/message.entity";
import type { PaginationOptions } from "./conversation.repository.interface";
import type { MessageType } from "../entities/message.entity";

export interface PaginatedMessages {
  messages: Message[];
  nextCursor: string | null;
  total: number;
}

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string | null;
  metadata?: Record<string, unknown>;
  moderationStatus?: MessageModerationStatus;
  moderationReason?: string | null;
  moderationSignals?: Record<string, unknown> | null;
  spamScore?: number | null;
}

export interface MessageRepository {
  create(data: CreateMessageInput): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findByConversation(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedMessages>;
  softDelete(id: string): Promise<void>;
  markAsDisputeEvidence(conversationId: string): Promise<void>;
  updateModerationStatus(
    id: string,
    status: MessageModerationStatus,
    score: number,
  ): Promise<void>;
  /** Sets the moderation decision + human-readable reason (admin review path). */
  setModerationDecision(
    id: string,
    status: MessageModerationStatus,
    reason: string | null,
  ): Promise<void>;
}
