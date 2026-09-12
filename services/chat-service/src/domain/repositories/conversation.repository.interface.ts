import type {
  Conversation,
  ConversationParticipant,
  ModerationStatus,
  ConversationType,
  ParticipantRole,
} from "../entities/conversation.entity";

export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  moderationStatus: ModerationStatus;
  relatedProductId: string | null;
  relatedOrderId: string | null;
  relatedShipmentId: string | null;
  relatedSupplierRequestId: string | null;
  metadata: Record<string, unknown>;
  lastMessageAt: Date | null;
  createdAt: Date;
  /** Number of messages sent after this participant's lastReadAt */
  unreadCount: number;
  /** Truncated preview of the last message (max 100 chars) */
  lastMessagePreview: string | null;
  /** Display name of the other participant in the conversation */
  otherParticipantName: string;
}

export interface PaginatedConversations {
  conversations: ConversationListItem[];
  nextCursor: string | null;
  total: number;
}

export interface CreateConversationInput {
  type: ConversationType;
  relatedProductId?: string | null;
  relatedOrderId?: string | null;
  relatedShipmentId?: string | null;
  relatedSupplierRequestId?: string | null;
  metadata?: Record<string, unknown>;
  participants: Array<{
    userId: string;
    role: ParticipantRole;
  }>;
}

export interface ConversationRepository {
  create(data: CreateConversationInput): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findExisting(
    buyerId: string,
    sellerId: string,
    productId: string,
  ): Promise<Conversation | null>;
  findByParticipant(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedConversations>;
  updateLastMessageAt(id: string, at: Date): Promise<void>;
  updateModerationStatus(id: string, status: ModerationStatus): Promise<void>;
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
  getParticipants(conversationId: string): Promise<ConversationParticipant[]>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
  updateLastReadAt(
    conversationId: string,
    userId: string,
    at: Date,
  ): Promise<void>;
  setMuted(
    conversationId: string,
    userId: string,
    muted: boolean,
  ): Promise<void>;
}
