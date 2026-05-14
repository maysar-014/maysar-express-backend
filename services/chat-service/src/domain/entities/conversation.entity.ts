export type ConversationType =
  | 'BUYER_SELLER'
  | 'SELLER_SUPPLIER'
  | 'BUYER_COURIER'
  | 'SELLER_TEAM';

export type ModerationStatus = 'ACTIVE' | 'FLAGGED' | 'BLOCKED' | 'ARCHIVED';

export type ParticipantRole = 'BUYER' | 'SELLER' | 'SUPPLIER' | 'COURIER';

export interface Conversation {
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
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  lastReadAt: Date | null;
  isMuted: boolean;
  joinedAt: Date;
}
