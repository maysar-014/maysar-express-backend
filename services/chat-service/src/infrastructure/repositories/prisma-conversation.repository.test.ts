import { PrismaConversationRepository } from './prisma-conversation.repository';

const buildPrismaMock = () => ({
  $transaction: jest.fn(async (callback: any) => callback({
    chat_Conversation: {
      create: jest.fn(),
    },
    chat_ConversationParticipant: {
      createMany: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
  })),
  chat_Conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  chat_ConversationParticipant: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chat_Message: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  $queryRaw: jest.fn(),
});

describe('PrismaConversationRepository', () => {
  it('creates conversations and maps participants correctly', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      chat_Conversation: {
        create: jest.fn().mockResolvedValue({
          id: 'conv-1',
          type: 'BUYER_SELLER',
          moderationStatus: 'ACTIVE',
          relatedProductId: 'product-1',
          relatedOrderId: null,
          relatedShipmentId: null,
          relatedSupplierRequestId: null,
          metadata: { source: 'product-page' },
          lastMessageAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
      chat_ConversationParticipant: {
        createMany: jest.fn().mockResolvedValue(undefined),
      },
    }));

    const repository = new PrismaConversationRepository(prisma as never);
    const conversation = await repository.create({
      type: 'BUYER_SELLER',
      relatedProductId: 'product-1',
      participants: [
        { userId: 'buyer-1', role: 'BUYER' },
        { userId: 'seller-1', role: 'SELLER' },
      ],
    });

    expect(conversation).toMatchObject({
      id: 'conv-1',
      type: 'BUYER_SELLER',
      relatedProductId: 'product-1',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('retrieves conversation lists, participants, and membership state', async () => {
    const prisma = buildPrismaMock();
    prisma.chat_Conversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      type: 'BUYER_SELLER',
      moderationStatus: 'ACTIVE',
      relatedProductId: 'product-1',
      relatedOrderId: null,
      relatedShipmentId: null,
      relatedSupplierRequestId: null,
      metadata: {},
      lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      participants: [],
    });
    prisma.chat_Conversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      type: 'BUYER_SELLER',
      moderationStatus: 'ACTIVE',
      relatedProductId: 'product-1',
      relatedOrderId: null,
      relatedShipmentId: null,
      relatedSupplierRequestId: null,
      metadata: {},
      lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.chat_ConversationParticipant.findMany
      .mockResolvedValueOnce([
        {
          conversationId: 'conv-1',
          userId: 'seller-1',
          role: 'SELLER',
          lastReadAt: new Date('2026-01-01T12:00:00.000Z'),
          isMuted: false,
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          conversation: {
            id: 'conv-1',
            type: 'BUYER_SELLER',
            moderationStatus: 'ACTIVE',
            relatedProductId: 'product-1',
            relatedOrderId: null,
            relatedShipmentId: null,
            relatedSupplierRequestId: null,
            metadata: {},
            lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          conversationId: 'conv-1',
          userId: 'buyer-1',
          role: 'BUYER',
          lastReadAt: null,
          isMuted: false,
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          conversation: {
            id: 'conv-1',
            type: 'BUYER_SELLER',
            moderationStatus: 'ACTIVE',
            relatedProductId: 'product-1',
            relatedOrderId: null,
            relatedShipmentId: null,
            relatedSupplierRequestId: null,
            metadata: {},
            lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          conversationId: 'conv-1',
          userId: 'seller-1',
          role: 'SELLER',
          lastReadAt: new Date('2026-01-01T12:00:00.000Z'),
          isMuted: false,
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          conversation: {
            id: 'conv-1',
            type: 'BUYER_SELLER',
            moderationStatus: 'ACTIVE',
            relatedProductId: 'product-1',
            relatedOrderId: null,
            relatedShipmentId: null,
            relatedSupplierRequestId: null,
            metadata: {},
            lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ]);
    prisma.chat_Message.count.mockResolvedValue(2);
    prisma.chat_Message.findFirst.mockResolvedValue({
      content: 'Hello buyer',
      type: 'TEXT',
    });
    prisma.$queryRaw.mockResolvedValue([{ display_name: 'Seller One', email: 'seller@example.com' }]);
    prisma.chat_ConversationParticipant.findUnique.mockResolvedValueOnce({ id: 'participant-1' });
    prisma.chat_ConversationParticipant.findUnique.mockResolvedValueOnce(null);

    const repository = new PrismaConversationRepository(prisma as never);
    const found = await repository.findById('conv-1');
    const existing = await repository.findExisting('buyer-1', 'seller-1', 'product-1');
    const paginated = await repository.findByParticipant('buyer-1', { limit: 10 });
    const participants = await repository.getParticipants('conv-1');
    const membership = await repository.isParticipant('conv-1', 'seller-1');

    expect(found).toMatchObject({ id: 'conv-1', relatedProductId: 'product-1' });
    expect(existing?.id).toBe('conv-1');
    expect(paginated.conversations).toHaveLength(1);
    expect(paginated.conversations[0]).toMatchObject({
      id: 'conv-1',
      unreadCount: 2,
      lastMessagePreview: 'Hello buyer',
      otherParticipantName: 'Seller One',
    });
    expect(participants).toHaveLength(1);
    expect(membership).toBe(true);
  });

  it('updates moderation metadata and participant state', async () => {
    const prisma = buildPrismaMock();
    const repository = new PrismaConversationRepository(prisma as never);

    await repository.updateLastMessageAt('conv-1', new Date('2026-01-03T00:00:00.000Z'));
    await repository.updateModerationStatus('conv-1', 'ARCHIVED');
    await repository.updateMetadata('conv-1', { hidden: true });
    await repository.updateLastReadAt('conv-1', 'buyer-1', new Date('2026-01-04T00:00:00.000Z'));
    await repository.setMuted('conv-1', 'buyer-1', true);

    expect(prisma.chat_Conversation.update).toHaveBeenCalledTimes(3);
    expect(prisma.chat_ConversationParticipant.update).toHaveBeenCalledTimes(2);
  });
});
