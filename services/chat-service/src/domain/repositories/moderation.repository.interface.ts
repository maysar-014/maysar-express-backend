import type {
  ModerationReport,
  UserBlock,
  SpamScoreLog,
  AdminModerationAction,
  AdminReviewAction,
  SuspiciousPhrase,
  SuspiciousPhraseInput,
  EmergingPattern,
  PhraseLanguage,
  PhraseMatchType,
} from "../entities/moderation.entity";
import type { MessageModerationStatus } from "../entities/message.entity";

export interface ModeratedMessageFilter {
  statuses: MessageModerationStatus[];
  search?: string;
  limit: number;
  cursor?: string;
}

export interface SuspiciousPhraseFilter {
  activeOnly?: boolean;
  category?: string;
}

export interface SuspiciousPhraseUpdate {
  matchType?: PhraseMatchType;
  language?: PhraseLanguage;
  category?: string;
  description?: string | null;
  weight?: number;
  action?: "FLAG" | "BLOCK";
  isActive?: boolean;
}

export interface ModerationRepository {
  // ── User-facing moderation ──────────────────────────────────────────────────
  createReport(
    data: Omit<ModerationReport, "id" | "reportedAt">,
  ): Promise<ModerationReport>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEither(userA: string, userB: string): Promise<boolean>;

  // ── Spam scoring audit trail ────────────────────────────────────────────────
  logSpamScore(
    messageId: string,
    score: number,
    signals: Record<string, unknown>,
  ): Promise<void>;
  listSpamScoreLogs(messageId: string): Promise<SpamScoreLog[]>;

  // ── Admin: flagged/blocked message review ───────────────────────────────────
  listModeratedMessages(
    filter: ModeratedMessageFilter,
  ): Promise<{
    messages: Record<string, unknown>[];
    nextCursor: string | null;
    total: number;
  }>;
  listReportsForMessage(messageId: string): Promise<ModerationReport[]>;
  createAdminAction(
    messageId: string,
    adminId: string,
    action: AdminReviewAction,
    notes?: string | null,
  ): Promise<AdminModerationAction>;
  listAdminActions(messageId: string): Promise<AdminModerationAction[]>;

  // ── Admin: configurable suspicious phrases (dynamic registry) ───────────────
  createSuspiciousPhrase(
    data: SuspiciousPhraseInput,
  ): Promise<SuspiciousPhrase>;
  findSuspiciousPhraseByPhrase(
    phrase: string,
  ): Promise<SuspiciousPhrase | null>;
  findSuspiciousPhraseById(id: string): Promise<SuspiciousPhrase | null>;
  listSuspiciousPhrases(
    filter?: SuspiciousPhraseFilter,
  ): Promise<SuspiciousPhrase[]>;
  updateSuspiciousPhrase(
    id: string,
    data: SuspiciousPhraseUpdate,
  ): Promise<SuspiciousPhrase | null>;
  deleteSuspiciousPhrase(id: string): Promise<void>;
  incrementSuspiciousPhraseMatches(phrases: string[]): Promise<void>;
  countSuspiciousPhrases(): Promise<number>;

  // ── Dynamic: emerging patterns mined from moderated content ────────────────
  upsertEmergingPattern(
    phrase: string,
    sampleMessageId: string,
    conversationId: string,
  ): Promise<void>;
  listEmergingPatterns(
    status?: EmergingPattern["status"],
  ): Promise<EmergingPattern[]>;
  findEmergingPatternById(id: string): Promise<EmergingPattern | null>;
  findEmergingPatternByPhrase(phrase: string): Promise<EmergingPattern | null>;
  updateEmergingPatternStatus(
    id: string,
    status: EmergingPattern["status"],
  ): Promise<EmergingPattern | null>;
  listRecentModeratedContents(
    limit: number,
    days: number,
  ): Promise<
    Array<{
      id: string;
      senderId: string;
      content: string;
      conversationId: string;
      moderationStatus: MessageModerationStatus;
    }>
  >;
}
