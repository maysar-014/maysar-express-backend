import { PrismaMessageRepository } from './prisma-message.repository';

describe('PrismaMessageRepository', () => {
  it('creates messages and maps finders with pagination', async () => {
    const createdAt = new Date('2026-05-01T12:00:00.000Z');
    const prisma = {
      chat_Message: {
        create: jest.fn().mockResolvedValue({
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'sender-1',
          type: 'TEXT',
          content: 'hello',
          metadata: { mood: 'friendly' },
          moderationStatus: 'ACTIVE',
          spamScore: 10,
          isDisputeEvidence: false,
          deletedAt: null,
          createdAt
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'sender-1',
          type: 'TEXT',
          content: 'hello',
          metadata: { mood: 'friendly' },
          moderationStatus: 'ACTIVE',
          spamScore: 10,
          isDisputeEvidence: false,
          deletedAt: null,
          createdAt
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'sender-1',
            type: 'TEXT',
            content: 'hello',
            metadata: { mood: 'friendly' },
            moderationStatus: 'ACTIVE',
            spamScore: 10,
            isDisputeEvidence: false,
            deletedAt: null,
            createdAt
          }
        ]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue(undefined)
      }
    };
    const repository = new PrismaMessageRepository(prisma as never);

    const created = await repository.create({
      conversationId: 'conv-1',
      senderId: 'sender-1',
      type: 'TEXT',
      content: 'hello',
      metadata: { mood: 'friendly' },
      moderationStatus: 'ACTIVE',
      spamScore: 10
    });
    const found = await repository.findById('msg-1');
    const page = await repository.findByConversation('conv-1', { limit: 1, cursor: '2026-05-01T00:00:00.000Z' });
    await repository.softDelete('msg-1');
    await repository.markAsDisputeEvidence('conv-1');
    await repository.updateModerationStatus('msg-1', 'FLAGGED', 80);

    expect(created.id).toBe('msg-1');
    expect(found?.metadata).toEqual({ mood: 'friendly' });
    expect(page).toEqual({
      messages: [expect.objectContaining({ id: 'msg-1' })],
      nextCursor: '2026-05-01T12:00:00.000Z',
      total: 1
    });
    expect(prisma.chat_Message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          moderationStatus: 'FLAGGED',
          spamScore: 80
        })
      })
    );
    expect(prisma.chat_Message.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      data: { isDisputeEvidence: true }
    });
  });
});
