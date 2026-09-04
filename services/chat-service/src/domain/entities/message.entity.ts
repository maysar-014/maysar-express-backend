export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VOICE_NOTE'
  | 'PRODUCT_CARD'
  | 'ORDER_REFERENCE'
  | 'ORDER_CARD'
  | 'LOCATION_PIN'
  | 'QUICK_ACTION';

export type QuickActionType =
  | 'CONFIRM_AVAILABILITY'
  | 'REQUEST_QUOTE'
  | 'TRACK_ORDER'
  | 'ACCEPT_OFFER'
  | 'DECLINE_OFFER'
  | 'CONFIRM_ORDER'
  | 'DECLINE_ORDER';

export type MessageModerationStatus = 'ACTIVE' | 'FLAGGED' | 'BLOCKED';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  metadata: Record<string, unknown>;
  moderationStatus: MessageModerationStatus;
  spamScore: number | null;
  isDisputeEvidence: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}
