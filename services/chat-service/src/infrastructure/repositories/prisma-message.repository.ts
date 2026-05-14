import { PrismaClient, Prisma } from '@prisma/client';
import type {
  MessageRepository,
  CreateMessageInput,
  PaginatedMessages,
} from '../../domain/repositories/message.repository.interface';
import type { Message, MessageModerationStatus } from '../../domain/entities/message.entity';
import type { PaginationOptions } from '../../domain/repositories/conversation.repository.interface';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  metadata: Prisma.JsonValue | null;
  moderationStatus: string;
  spamScore: number | null;
  isDisputeEvidence: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    type: row.type as Message['type'],
    content: row.content ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    moderationStatus: row.moderationStatus as MessageModerationStatus,
    spamScore: row.spamScore ?? null,
    isDisputeEvidence: row.isDisputeEvidence,
    deletedAt: row.deletedAt ?? null,
    createdAt: row.createdAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateMessageInput): Promise<Message> {
    const row = await this.prisma.chat_Message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        type: data.type as never,
        content: data.content ?? null,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        moderationStatus: (data.moderationStatus ?? 'ACTIVE') as never,
        spamScore: data.spamScore ?? null,
      },
    });
    return mapMessage(row);
  }

  async findById(id: string): Promise<Message | null> {
    const row = await this.prisma.chat_Message.findUnique({ where: { id } });
    if (!row) return null;
    return mapMessage(row);
  }

  async findByConversation(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedMessages> {
    const { limit, cursor } = options;
    const cursorDate = cursor ? new Date(cursor) : undefined;

    const [rows, total] = await Promise.all([
      this.prisma.chat_Message.findMany({
        where: {
          conversationId,
          ...(cursorDate ? { createdAt: { gt: cursorDate } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      }),
      this.prisma.chat_Message.count({ where: { conversationId } }),
    ]);

    const messages = rows.map(mapMessage);
    const nextCursor =
      rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null;

    return { messages, nextCursor, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.chat_Message.update({
      where: { id },
      data: {
        content: '[message deleted]',
        deletedAt: new Date(),
      },
    });
  }

  async markAsDisputeEvidence(conversationId: string): Promise<void> {
    await this.prisma.chat_Message.updateMany({
      where: { conversationId },
      data: { isDisputeEvidence: true },
    });
  }

  async updateModerationStatus(
    id: string,
    status: MessageModerationStatus,
    score: number,
  ): Promise<void> {
    await this.prisma.chat_Message.update({
      where: { id },
      data: {
        moderationStatus: status as never,
        spamScore: score,
      },
    });
  }
}
