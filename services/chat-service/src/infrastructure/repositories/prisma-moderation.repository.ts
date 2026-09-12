import { PrismaClient, Prisma } from "@prisma/client";
import type {
  ModerationRepository,
  ModeratedMessageFilter,
  SuspiciousPhraseFilter,
  SuspiciousPhraseUpdate,
} from "../../domain/repositories/moderation.repository.interface";
import type {
  ModerationReport,
  UserBlock,
  SpamScoreLog,
  AdminModerationAction,
  AdminReviewAction,
  SuspiciousPhrase,
  SuspiciousPhraseInput,
  EmergingPattern,
} from "../../domain/entities/moderation.entity";
import type { MessageModerationStatus } from "../../domain/entities/message.entity";

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapReport(row: {
  id: string;
  reporterId: string;
  messageId: string;
  conversationId: string;
  reason: string;
  reportedAt: Date;
}): ModerationReport {
  return {
    id: row.id,
    reporterId: row.reporterId,
    messageId: row.messageId,
    conversationId: row.conversationId,
    reason: row.reason,
    reportedAt: row.reportedAt,
  };
}

function mapPhrase(row: {
  id: string;
  phrase: string;
  matchType: string;
  language: string;
  category: string;
  description: string | null;
  weight: number;
  action: string;
  isActive: boolean;
  source: string;
  timesMatched: number;
  createdAt: Date;
  updatedAt: Date;
}): SuspiciousPhrase {
  return {
    id: row.id,
    phrase: row.phrase,
    matchType: row.matchType as SuspiciousPhrase["matchType"],
    language: row.language as SuspiciousPhrase["language"],
    category: row.category,
    description: row.description,
    weight: row.weight,
    action: row.action as SuspiciousPhrase["action"],
    isActive: row.isActive,
    source: row.source as SuspiciousPhrase["source"],
    timesMatched: row.timesMatched,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEmergingPattern(row: {
  id: string;
  phrase: string;
  occurrences: number;
  conversationCount: number;
  sampleMessageIds: Prisma.JsonValue | null;
  status: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}): EmergingPattern {
  return {
    id: row.id,
    phrase: row.phrase,
    occurrences: row.occurrences,
    conversationCount: row.conversationCount,
    sampleMessageIds: Array.isArray(row.sampleMessageIds)
      ? (row.sampleMessageIds as string[])
      : [],
    status: row.status as EmergingPattern["status"],
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaModerationRepository implements ModerationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createReport(
    data: Omit<ModerationReport, "id" | "reportedAt">,
  ): Promise<ModerationReport> {
    const row = await this.prisma.chat_ModerationReport.create({
      data: {
        reporterId: data.reporterId,
        messageId: data.messageId,
        conversationId: data.conversationId,
        reason: data.reason,
      },
    });
    return mapReport(row);
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.chat_UserBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.chat_UserBlock.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const row = await this.prisma.chat_UserBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });
    return row !== null;
  }

  async isBlockedEither(userA: string, userB: string): Promise<boolean> {
    const count = await this.prisma.chat_UserBlock.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return count > 0;
  }

  // ── Spam scoring audit trail ────────────────────────────────────────────────

  async logSpamScore(
    messageId: string,
    score: number,
    signals: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.chat_SpamScoreLog.create({
      data: {
        messageId,
        score,
        signals: signals as Prisma.InputJsonValue,
      },
    });
  }

  async listSpamScoreLogs(messageId: string): Promise<SpamScoreLog[]> {
    const rows = await this.prisma.chat_SpamScoreLog.findMany({
      where: { messageId },
      orderBy: { computedAt: "desc" },
      take: 20,
    });
    return rows.map((row) => ({
      id: row.id,
      messageId: row.messageId,
      score: row.score,
      signals: (row.signals as Record<string, unknown>) ?? {},
      computedAt: row.computedAt,
    }));
  }

  // ── Admin: flagged/blocked message review ───────────────────────────────────

  async listModeratedMessages(
    filter: ModeratedMessageFilter,
  ): Promise<{
    messages: Record<string, unknown>[];
    nextCursor: string | null;
    total: number;
  }> {
    const { statuses, search, limit, cursor } = filter;
    const cursorDate = cursor ? new Date(cursor) : undefined;

    const contentFilter = search
      ? { content: { contains: search, mode: "insensitive" as const } }
      : {};

    const where = {
      moderationStatus: { in: statuses },
      deletedAt: null,
      ...contentFilter,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.chat_Message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.chat_Message.count({
        where: {
          moderationStatus: { in: statuses },
          deletedAt: null,
          ...contentFilter,
        },
      }),
    ]);

    const nextCursor =
      rows.length === limit
        ? rows[rows.length - 1].createdAt.toISOString()
        : null;

    return {
      messages: rows as unknown as Record<string, unknown>[],
      nextCursor,
      total,
    };
  }

  async listReportsForMessage(messageId: string): Promise<ModerationReport[]> {
    const rows = await this.prisma.chat_ModerationReport.findMany({
      where: { messageId },
      orderBy: { reportedAt: "desc" },
      take: 50,
    });
    return rows.map(mapReport);
  }

  async createAdminAction(
    messageId: string,
    adminId: string,
    action: AdminReviewAction,
    notes?: string | null,
  ): Promise<AdminModerationAction> {
    const row = await this.prisma.chat_ModerationAction.create({
      data: {
        messageId,
        adminId,
        action: action as never,
        notes: notes ?? null,
      },
    });
    return {
      id: row.id,
      messageId: row.messageId,
      adminId: row.adminId,
      action: row.action as AdminReviewAction,
      notes: row.notes,
      createdAt: row.createdAt,
    };
  }

  async listAdminActions(messageId: string): Promise<AdminModerationAction[]> {
    const rows = await this.prisma.chat_ModerationAction.findMany({
      where: { messageId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      messageId: row.messageId,
      adminId: row.adminId,
      action: row.action as AdminReviewAction,
      notes: row.notes,
      createdAt: row.createdAt,
    }));
  }

  // ── Admin: configurable suspicious phrases (dynamic registry) ───────────────

  async createSuspiciousPhrase(
    data: SuspiciousPhraseInput,
  ): Promise<SuspiciousPhrase> {
    const row = await this.prisma.chat_SuspiciousPhrase.create({
      data: {
        phrase: data.phrase,
        matchType: (data.matchType ?? "SUBSTRING") as never,
        language: (data.language ?? "EN") as never,
        category: data.category,
        description: data.description ?? null,
        weight: data.weight ?? 70,
        action: (data.action ?? "FLAG") as never,
        isActive: data.isActive ?? true,
        source: (data.source ?? "ADMIN") as never,
      },
    });
    return mapPhrase(row);
  }

  async findSuspiciousPhraseByPhrase(
    phrase: string,
  ): Promise<SuspiciousPhrase | null> {
    const row = await this.prisma.chat_SuspiciousPhrase.findUnique({
      where: { phrase },
    });
    return row ? mapPhrase(row) : null;
  }

  async findSuspiciousPhraseById(id: string): Promise<SuspiciousPhrase | null> {
    const row = await this.prisma.chat_SuspiciousPhrase.findUnique({
      where: { id },
    });
    return row ? mapPhrase(row) : null;
  }

  async listSuspiciousPhrases(
    filter?: SuspiciousPhraseFilter,
  ): Promise<SuspiciousPhrase[]> {
    const rows = await this.prisma.chat_SuspiciousPhrase.findMany({
      where: {
        ...(filter?.activeOnly ? { isActive: true } : {}),
        ...(filter?.category ? { category: filter.category } : {}),
      },
      orderBy: [{ category: "asc" }, { phrase: "asc" }],
      take: 1000,
    });
    return rows.map(mapPhrase);
  }

  async updateSuspiciousPhrase(
    id: string,
    data: SuspiciousPhraseUpdate,
  ): Promise<SuspiciousPhrase | null> {
    const row = await this.prisma.chat_SuspiciousPhrase.update({
      where: { id },
      data: {
        ...(data.matchType !== undefined
          ? { matchType: data.matchType as never }
          : {}),
        ...(data.language !== undefined
          ? { language: data.language as never }
          : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.action !== undefined ? { action: data.action as never } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    return row ? mapPhrase(row) : null;
  }

  async deleteSuspiciousPhrase(id: string): Promise<void> {
    await this.prisma.chat_SuspiciousPhrase.delete({ where: { id } });
  }

  async incrementSuspiciousPhraseMatches(phrases: string[]): Promise<void> {
    if (phrases.length === 0) return;
    await this.prisma.chat_SuspiciousPhrase.updateMany({
      where: { phrase: { in: phrases } },
      data: { timesMatched: { increment: 1 } },
    });
  }

  async countSuspiciousPhrases(): Promise<number> {
    return this.prisma.chat_SuspiciousPhrase.count();
  }

  // ── Dynamic: emerging patterns mined from moderated content ────────────────

  async upsertEmergingPattern(
    phrase: string,
    sampleMessageId: string,
    conversationId: string,
  ): Promise<void> {
    const existing = await this.prisma.chat_EmergingPattern.findUnique({
      where: { phrase },
    });
    if (existing) {
      await this.prisma.chat_EmergingPattern.update({
        where: { phrase },
        data: {
          occurrences: { increment: 1 },
          lastSeenAt: new Date(),
          sampleMessageIds: [
            ...((existing.sampleMessageIds as string[]) ?? []),
            sampleMessageId,
          ].slice(-10),
        },
      });
      void conversationId;
      return;
    }
    await this.prisma.chat_EmergingPattern.create({
      data: {
        phrase,
        occurrences: 1,
        conversationCount: 1,
        sampleMessageIds: [sampleMessageId],
        status: "PENDING",
      },
    });
  }

  async listEmergingPatterns(
    status?: EmergingPattern["status"],
  ): Promise<EmergingPattern[]> {
    const rows = await this.prisma.chat_EmergingPattern.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: [{ occurrences: "desc" }, { lastSeenAt: "desc" }],
      take: 100,
    });
    return rows.map(mapEmergingPattern);
  }

  async findEmergingPatternById(id: string): Promise<EmergingPattern | null> {
    const row = await this.prisma.chat_EmergingPattern.findUnique({
      where: { id },
    });
    return row ? mapEmergingPattern(row) : null;
  }

  async findEmergingPatternByPhrase(
    phrase: string,
  ): Promise<EmergingPattern | null> {
    const row = await this.prisma.chat_EmergingPattern.findUnique({
      where: { phrase },
    });
    return row ? mapEmergingPattern(row) : null;
  }

  async updateEmergingPatternStatus(
    id: string,
    status: EmergingPattern["status"],
  ): Promise<EmergingPattern | null> {
    const row = await this.prisma.chat_EmergingPattern.update({
      where: { id },
      data: { status: status as never },
    });
    return row ? mapEmergingPattern(row) : null;
  }

  async listRecentModeratedContents(
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
  > {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.chat_Message.findMany({
      where: {
        moderationStatus: { in: ["FLAGGED", "BLOCKED"] },
        content: { not: null },
        deletedAt: null,
        createdAt: { gte: cutoff },
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        conversationId: true,
        moderationStatus: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      senderId: row.senderId,
      content: row.content ?? "",
      conversationId: row.conversationId,
      moderationStatus: row.moderationStatus as MessageModerationStatus,
    }));
  }
}
