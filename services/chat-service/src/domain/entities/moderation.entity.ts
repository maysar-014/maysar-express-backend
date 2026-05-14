export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  messageId: string;
  conversationId: string;
  reason: string;
  reportedAt: Date;
}

export interface SpamScoreLog {
  id: string;
  messageId: string;
  score: number;
  signals: Record<string, unknown>;
  computedAt: Date;
}
