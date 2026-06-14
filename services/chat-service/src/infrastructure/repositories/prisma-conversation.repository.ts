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

    if (page.length === 0) {
      return { conversations: [], nextCursor: null, total };
    }

    const conversationIds = page.map((p) => p.conversation.id);

    // ── Batched queries (replaces per-item Promise.all fan-out) ──────────────

    // 1. Unread counts: one grouped raw query across all conversation IDs.
    //    Returns the count of unread messages per conversation for this user,
    //    using each participant's lastReadAt as the cutoff.
    //    We use $queryRaw for a single round-trip instead of N sequential counts.
    const lastReadAtMap = new Map<string, Date | null>();
    for (const p of page) {
      lastReadAtMap.set(p.conversation.id, p.lastReadAt);
    }

    // Build a VALUES list for the per-conversation lastReadAt cutoffs
    // so we can do a single JOIN instead of N queries.
    const unreadCountMap = new Map<string, number>();
    try {
      // Use a single raw query: join messages with a cutoff table derived from participant lastReadAt
      // Table name: chat_messages (@@map of chat_Message model in schema.prisma)
      // Table name: chat_conversation_participants (@@map of chat_ConversationParticipant)
      const unreadRows = await this.prisma.$queryRaw<Array<{
        conversation_id: string;
        unread_count: bigint;
      }>>`
        SELECT
          m."conversationId" AS conversation_id,
          COUNT(*)           AS unread_count
        FROM chat_messages m
        JOIN (
          SELECT
            p."conversationId",
            p."lastReadAt"
          FROM chat_conversation_participants p
          WHERE p."userId"           = ${userId}
            AND p."conversationId"   = ANY(${conversationIds}::text[])
        ) cutoff ON cutoff."conversationId" = m."conversationId"
        WHERE m."deletedAt" IS NULL
          AND (cutoff."lastReadAt" IS NULL OR m."createdAt" > cutoff."lastReadAt")
        GROUP BY m."conversationId"
      `;
      for (const row of unreadRows) {
        unreadCountMap.set(row.conversation_id, Number(row.unread_count));
      }
    } catch {
      // Fallback: leave all unread counts at 0 rather than crashing
    }

    // 2. Last messages: DISTINCT ON (conversationId) ordered by createdAt DESC.
    //    Bounded to the page's conversation IDs — no full table scan.
    //    Table name: chat_messages (@@map of chat_Message model in schema.prisma)
    const lastMessageMap = new Map<string, { content: string | null; type: string }>();
    try {
      const lastMsgRows = await this.prisma.$queryRaw<Array<{
        conversation_id: string;
        content: string | null;
        type: string;
      }>>`
        SELECT DISTINCT ON ("conversationId")
          "conversationId" AS conversation_id,
          content,
          type
        FROM chat_messages
        WHERE "conversationId" = ANY(${conversationIds}::text[])
        ORDER BY "conversationId", "createdAt" DESC
      `;
      for (const row of lastMsgRows) {
        lastMessageMap.set(row.conversation_id, { content: row.content, type: row.type });
      }
    } catch {
      // Fallback: no last-message previews rather than crashing
    }

    // 3. Other participants: one findMany for all conversation IDs
    const allOtherParticipants = await this.prisma.chat_ConversationParticipant.findMany({
      where: {
        conversationId: { in: conversationIds },
        userId: { not: userId },
      },
    });
    const otherParticipantsMap = new Map<string, typeof allOtherParticipants[0][]>();
    for (const p of allOtherParticipants) {
      const existing = otherParticipantsMap.get(p.conversationId) ?? [];
      existing.push(p);
      otherParticipantsMap.set(p.conversationId, existing);
    }

    // 4. User display names: collect unique other-user IDs, resolve in one $queryRaw IN(...)
    const otherUserIds = [
      ...new Set(
        allOtherParticipants.map((p) => p.userId),
      ),
    ];

    const userNameMap = new Map<string, string>();
    if (otherUserIds.length > 0) {
      try {
        const userRows = await this.prisma.$queryRaw<Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>>`
          SELECT
            u.id,
            u."firstName"  AS first_name,
            u."lastName"   AS last_name,
            a.email        AS email
          FROM "user_User" u
          LEFT JOIN auth_users a ON a.id = u.id
          WHERE u.id = ANY(${otherUserIds}::text[])
        `;
        for (const row of userRows) {
          const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
          userNameMap.set(row.id, fullName || row.email || `User ${row.id.slice(-8)}`);
        }
      } catch {
        // DB schema mismatch — fall back to userId fragment for all
        for (const uid of otherUserIds) {
          userNameMap.set(uid, `User ${uid.slice(-8)}`);
        }
      }
    }

    // ── Assemble result ──────────────────────────────────────────────────────
    const typeLabels: Record<string, string> = {
      IMAGE: '📷 Image',
      VOICE_NOTE: '🎤 Voice note',
      PRODUCT_CARD: '🛍️ Product',
      ORDER_REFERENCE: '📦 Order',
      LOCATION_PIN: '📍 Location',
      QUICK_ACTION: '⚡ Quick action',
    };

    const enriched: ConversationListItem[] = page.map((p) => {
      const conv = p.conversation;
      const lastMsg = lastMessageMap.get(conv.id) ?? null;
      const others = otherParticipantsMap.get(conv.id) ?? [];

      let lastMessagePreview: string | null = null;
      if (lastMsg) {
        if (lastMsg.content) {
          lastMessagePreview = lastMsg.content.slice(0, 100);
        } else {
          lastMessagePreview = typeLabels[lastMsg.type] ?? lastMsg.type;
        }
      }
      const otherParticipantName =
        others.length > 0
          ? (userNameMap.get(others[0].userId) ?? `User ${others[0].userId.slice(-8)}`)
          : 'Unknown';

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
        unreadCount: unreadCountMap.get(conv.id) ?? 0,
        lastMessagePreview,
        otherParticipantName,
      };
    });

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
