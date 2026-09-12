import type {
  ModerationRepository,
  ModeratedMessageFilter,
} from "../../domain/repositories/moderation.repository.interface";
import type { MessageRepository } from "../../domain/repositories/message.repository.interface";
import type {
  AdminReviewAction,
  AdminModerationAction,
  ModerationReport,
  SpamScoreLog,
} from "../../domain/entities/moderation.entity";
import type { MessageModerationStatus } from "../../domain/entities/message.entity";
import { chatNotFound, chatValidationError } from "../../shared/errors";

export interface ModeratedMessageListItem {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  moderationStatus: string;
  moderationReason: string | null;
  moderationSignals: Record<string, unknown> | null;
  spamScore: number | null;
  isDisputeEvidence: boolean;
  createdAt: Date;
}

export interface ModeratedMessagePage {
  messages: ModeratedMessageListItem[];
  nextCursor: string | null;
  total: number;
}

export interface ModeratedMessageDetail {
  message: ModeratedMessageListItem;
  reports: ModerationReport[];
  spamLogs: SpamScoreLog[];
  adminActions: AdminModerationAction[];
}

/**
 * Admin moderation of flagged & blocked chat messages.
 *
 * Lets admins oversee, review and take action on messages that were flagged
 * (score >= FLAG threshold) or blocked (score >= BLOCK threshold) by the risk
 * engine or reported by users. Every decision is persisted as an admin action
 * for the audit trail.
 */
export class AdminModerationUseCase {
  constructor(
    private readonly moderationRepo: ModerationRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async listMessages(options: {
    status?: "FLAGGED" | "BLOCKED" | "ALL";
    search?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ModeratedMessagePage> {
    const statuses: MessageModerationStatus[] =
      options.status === "FLAGGED"
        ? ["FLAGGED"]
        : options.status === "BLOCKED"
          ? ["BLOCKED"]
          : ["FLAGGED", "BLOCKED"];

    const filter: ModeratedMessageFilter = {
      statuses,
      search: options.search?.trim() || undefined,
      limit: Math.min(Math.max(options.limit ?? 25, 1), 100),
      cursor: options.cursor,
    };

    const result = await this.moderationRepo.listModeratedMessages(filter);
    return {
      messages: result.messages.map(
        (row): ModeratedMessageListItem => ({
          id: row.id as string,
          conversationId: row.conversationId as string,
          senderId: row.senderId as string,
          type: row.type as string,
          content: (row.content as string | null) ?? null,
          moderationStatus: row.moderationStatus as string,
          moderationReason: (row.moderationReason as string | null) ?? null,
          moderationSignals:
            (row.moderationSignals as Record<string, unknown> | null) ?? null,
          spamScore: (row.spamScore as number | null) ?? null,
          isDisputeEvidence: Boolean(row.isDisputeEvidence),
          createdAt: row.createdAt as Date,
        }),
      ),
      nextCursor: result.nextCursor,
      total: result.total,
    };
  }

  async getMessageDetail(messageId: string): Promise<ModeratedMessageDetail> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) throw chatNotFound("Message");

    const [reports, spamLogs, adminActions] = await Promise.all([
      this.moderationRepo.listReportsForMessage(messageId),
      this.moderationRepo.listSpamScoreLogs(messageId),
      this.moderationRepo.listAdminActions(messageId),
    ]);

    return {
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        moderationStatus: message.moderationStatus,
        moderationReason: message.moderationReason,
        moderationSignals: message.moderationSignals,
        spamScore: message.spamScore,
        isDisputeEvidence: message.isDisputeEvidence,
        createdAt: message.createdAt,
      },
      reports,
      spamLogs,
      adminActions,
    };
  }

  async reviewMessage(
    adminId: string,
    messageId: string,
    action: AdminReviewAction,
    notes?: string | null,
  ): Promise<ModeratedMessageDetail> {
    if (!["APPROVE", "CONFIRM_BLOCK", "DELETE"].includes(action)) {
      throw chatValidationError(
        "action must be one of: APPROVE, CONFIRM_BLOCK, DELETE",
      );
    }

    const detail = await this.getMessageDetail(messageId);

    if (action === "APPROVE") {
      // Admin cleared the message — return it to the conversation
      await this.messageRepo.setModerationDecision(messageId, "ACTIVE", null);
    } else if (action === "CONFIRM_BLOCK") {
      const confirmed =
        detail.message.moderationReason ??
        "Message confirmed as violating chat policy by an administrator.";
      const reason = notes ? `${confirmed} (Admin: ${notes})` : confirmed;
      await this.messageRepo.setModerationDecision(
        messageId,
        "BLOCKED",
        reason,
      );
    } else if (action === "DELETE") {
      const removed = "Message removed by an administrator.";
      const reason = notes ? `${removed} (Admin: ${notes})` : removed;
      await this.messageRepo.softDelete(messageId);
      await this.messageRepo.setModerationDecision(
        messageId,
        "BLOCKED",
        reason,
      );
    }

    await this.moderationRepo.createAdminAction(
      messageId,
      adminId,
      action,
      notes ?? null,
    );

    return this.getMessageDetail(messageId);
  }
}
