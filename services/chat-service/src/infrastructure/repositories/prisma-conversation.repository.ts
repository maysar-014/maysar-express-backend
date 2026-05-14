import { PrismaClient, Prisma } from '@prisma/client';
import type {
  ConversationRepository,
  CreateConversationInput,
  PaginatedConversations,
  ConversationListItem,
  PaginationOptions,
} from '../../domain/repositories/conversation.repository.interface';
import type {
  Conversation,
  ConversationParticipant,
  ModerationStatus,
} from '../../domain/entities/conversation.entity';

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapConversation(row: {
  id: string;
  type: string;
  moderationStatus: string;
  relatedProductId: string | null;
  relatedOrderId: string | null;
  relatedShipmentId: string | null;
  relatedSupplierRequestId: string | null;
  metadata: Prisma.JsonValue | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}): Conversation {
  return {
    id: row.id,
    type: row.type as Conversation['type'],
    moderationStatus: row.moderationStatus as ModerationStatus,
    relatedProductId: row.relatedProductId ?? null,
    relatedOrderId: row.relatedOrderId ?? null,
    relatedShipmentId: row.relatedShipmentId ?? null,
    relatedSupplierRequestId: row.relatedSupplierRequestId ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    lastMessageAt: row.lastMessageAt ?? null,
    createdAt: row.createdAt,
  };
}

function mapParticipant(row: {
  conversationId: string;
  userId: string;
  role: string;
  lastReadAt: Date | null;
  isMuted: boolean;
  joinedAt: Date;
}): ConversationParticipant {
  return {
    conversationId: row.conversationId,
    userId: row.userId,
    role: row.role as ConversationParticipant['role'],
    lastReadAt: row.lastReadAt ?? null,
    isMuted: row.isMuted,
    joinedAt: row.joinedAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateConversationInput): Promise<Conversation> {
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.chat_Conversation.create({
        data: {
          type: data.type as never,
          moderationStatus: 'ACTIVE' as never,
          relatedProductId: data.relatedProductId ?? null,
          relatedOrderId: data.relatedOrderId ?? null,
          relatedShipmentId: data.relatedShipmentId ?? null,
          relatedSupplierRequestId: data.relatedSupplierRequestId ?? null,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });

      await tx.chat_ConversationParticipant.createMany({
        data: data.participants.map((p) => ({
          conversationId: conversation.id,
          userId: p.userId,
          role: p.role as never,
        })),
      });

      return conversation;
    });

    return mapConversation(result);
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = await this.prisma.chat_Conversation.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!row) return null;
    return mapConversation(row);
  }

  async findExisting(
    buyerId: string,
    sellerId: string,
    productId: string,
  ): Promise<Conversation | null> {
    const row = await this.prisma.chat_Conversation.findFirst({
      where: {
        type: 'BUYER_SELLER' as never,
        relatedProductId: productId,
        moderationStatus: { not: 'ARCHIVED' as never },
        participants: {
          some: { userId: buyerId },
        },
        AND: [
          {
            participants: {
              some: { userId: sellerId },
            },
          },
        ],
      },
    });
    if (!row) return null;
    return mapConversation(row);
  }

  async findByParticipant(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedConversations> {
    const { limit, cursor } = options;

    // Build cursor condition
    const cursorDate = cursor ? new Date(cursor) : undefined;

    const participantRows = await this.prisma.chat_ConversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: true,
      },
    });

    // Filter by cursor (lastMessageAt < cursorDate for pagination)
    const filtered = cursorDate
      ? participantRows.filter(
          (p) =>
            p.conversation.lastMessageAt === null ||
            p.conversation.lastMessageAt < cursorDate,
        )
      : participantRows;

    // Sort by lastMessageAt DESC (nulls last)
    filtered.sort((a, b) => {
      const aTime = a.conversation.lastMessageAt?.getTime() ?? 0;
      const bTime = b.conversation.lastMessageAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    const total = filtered.length;
    const page = filtered.slice(0, limit);

    // Enrich each conversation
    const enriched: ConversationListItem[] = await Promise.all(
      page.map(async (p) => {
        const conv = p.conversation;

        // Unread count: messages after participant's lastReadAt
        const unreadCount = await this.prisma.chat_Message.count({
          where: {
            conversationId: conv.id,
            createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
            deletedAt: null,
          },
        });

        // Last message preview
        const lastMsg = await this.prisma.chat_Message.findFirst({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'desc' },
        });

        let lastMessagePreview: string | null = null;
        if (lastMsg) {
          if (lastMsg.content) {
            lastMessagePreview = lastMsg.content.slice(0, 100);
          } else {
            const typeLabels: Record<string, string> = {
              IMAGE: '📷 Image',
              VOICE_NOTE: '🎤 Voice note',
              PRODUCT_CARD: '🛍️ Product',
              ORDER_REFERENCE: '📦 Order',
              LOCATION_PIN: '📍 Location',
              QUICK_ACTION: '⚡ Quick action',
            };
            lastMessagePreview = typeLabels[lastMsg.type] ?? lastMsg.type;
          }
        }

        // Other participant display name
        const otherParticipants = await this.prisma.chat_ConversationParticipant.findMany({
          where: {
            conversationId: conv.id,
            userId: { not: userId },
          },
        });

        let otherParticipantName = 'Unknown';
        if (otherParticipants.length > 0) {
          const otherUserId = otherParticipants[0].userId;
          const user = await this.prisma.$queryRaw<Array<{ display_name: string | null; email: string }>>`
            SELECT COALESCE(
              (SELECT display_name FROM user_profiles WHERE user_id = ${otherUserId} LIMIT 1),
              (SELECT email FROM auth_users WHERE id = ${otherUserId} LIMIT 1)
            ) AS display_name,
            COALESCE(email, '') AS email
            FROM auth_users
            WHERE id = ${otherUserId}
            LIMIT 1
          `;
          if (user.length > 0) {
            otherParticipantName = user[0].display_name ?? user[0].email ?? 'Unknown';
          }
        }

        return {
          id: conv.id,
          type: conv.type as ConversationListItem['type'],
          moderationStatus: conv.moderationStatus as ModerationStatus,
          relatedProductId: conv.relatedProductId ?? null,
          relatedOrderId: conv.relatedOrderId ?? null,
          relatedShipmentId: conv.relatedShipmentId ?? null,
          relatedSupplierRequestId: conv.relatedSupplierRequestId ?? null,
          metadata: (conv.metadata as Record<string, unknown>) ?? {},
          lastMessageAt: conv.lastMessageAt ?? null,
          createdAt: conv.createdAt,
          unreadCount,
          lastMessagePreview,
          otherParticipantName,
        };
      }),
    );

    const nextCursor =
      page.length === limit && page[page.length - 1]?.conversation.lastMessageAt
        ? page[page.length - 1].conversation.lastMessageAt!.toISOString()
        : null;

    return {
      conversations: enriched,
      nextCursor,
      total,
    };
  }

  async updateLastMessageAt(id: string, at: Date): Promise<void> {
    await this.prisma.chat_Conversation.update({
      where: { id },
      data: { lastMessageAt: at },
    });
  }

  async updateModerationStatus(id: string, status: ModerationStatus): Promise<void> {
    await this.prisma.chat_Conversation.update({
      where: { id },
      data: { moderationStatus: status as never },
    });
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
    await this.prisma.chat_Conversation.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  async getParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    const rows = await this.prisma.chat_ConversationParticipant.findMany({
      where: { conversationId },
    });
    return rows.map(mapParticipant);
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.chat_ConversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    return row !== null;
  }

  async updateLastReadAt(conversationId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.chat_ConversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: at },
    });
  }

  async setMuted(conversationId: string, userId: string, muted: boolean): Promise<void> {
    await this.prisma.chat_ConversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { isMuted: muted },
    });
  }
}
