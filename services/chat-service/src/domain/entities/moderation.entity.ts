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

export type AdminReviewAction = "APPROVE" | "CONFIRM_BLOCK" | "DELETE";

export interface AdminModerationAction {
  id: string;
  messageId: string;
  adminId: string;
  action: AdminReviewAction;
  notes: string | null;
  createdAt: Date;
}

export type PhraseMatchType = "SUBSTRING" | "REGEX";
export type PhraseLanguage = "EN" | "SW" | "OTHER";
export type PhraseAction = "FLAG" | "BLOCK";
export type PhraseSource = "SEED" | "ADMIN" | "AUTO";

/** A suspicious phrase/pattern definition — matches the Chat_SuspiciousPhrase model. */
export interface SuspiciousPhrase {
  id: string;
  phrase: string;
  matchType: PhraseMatchType;
  language: PhraseLanguage;
  category: string;
  description: string | null;
  weight: number;
  action: PhraseAction;
  isActive: boolean;
  source: PhraseSource;
  timesMatched: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuspiciousPhraseInput {
  phrase: string;
  matchType?: PhraseMatchType;
  language?: PhraseLanguage;
  category: string;
  description?: string | null;
  weight?: number;
  action?: PhraseAction;
  isActive?: boolean;
  source?: PhraseSource;
}

export type EmergingPatternStatus = "PENDING" | "PROMOTED" | "DISMISSED";

/** A dynamically mined pattern — recurring content observed across moderated messages. */
export interface EmergingPattern {
  id: string;
  phrase: string;
  occurrences: number;
  conversationCount: number;
  sampleMessageIds: string[];
  status: EmergingPatternStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
}
