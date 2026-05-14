import { PrismaClient } from '@prisma/client';
import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type { ModerationReport, UserBlock } from '../../domain/entities/moderation.entity';

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

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaModerationRepository implements ModerationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createReport(
    data: Omit<ModerationReport, 'id' | 'reportedAt'>,
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
}
