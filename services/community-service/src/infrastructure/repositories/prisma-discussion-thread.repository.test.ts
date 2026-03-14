import {
  DiscussionThread,
  ExpertiseLevel,
  ThreadStatus
} from '../../domain/entities/discussion-thread.entity';
import { PrismaDiscussionThreadRepository } from './prisma-discussion-thread.repository';

describe('PrismaDiscussionThreadRepository', () => {
  const makePrisma = () => ({
    community_DiscussionThread: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    community_ThreadAnswer: {
      count: jest.fn()
    }
  });

  const createThread = () =>
    DiscussionThread.create({
      id: 'thread-1',
      authorId: 'author-1',
      topic: 'How to improve monthly retained customers in retail?',
      content:
        'We have declining retention in the last quarter and need practical ideas with operational constraints included.',
      category: 'growth',
      expertiseLevel: ExpertiseLevel.INTERMEDIATE,
      businessContext: {
        industry: ['retail'],
        businessStage: 'scale',
        tags: ['retention']
      },
      maxResponsesPerUser: 3
    });

  const asRecord = (thread: DiscussionThread) => ({
    ...thread.toJSON(),
    status: ThreadStatus.OPEN
  });

  it('saves thread with upsert and returns mapped domain entity', async () => {
    const prisma = makePrisma();
    const thread = createThread();
    prisma.community_DiscussionThread.upsert.mockResolvedValue(asRecord(thread));
    const repo = new PrismaDiscussionThreadRepository(prisma as never);

    const saved = await repo.save(thread);

    expect(prisma.community_DiscussionThread.upsert).toHaveBeenCalledWith({
      where: { id: 'thread-1' },
      create: expect.objectContaining({
        id: 'thread-1',
        authorId: 'author-1',
        topic: thread.topic
      }),
      update: expect.objectContaining({
        id: 'thread-1',
        category: 'growth'
      })
    });
    expect(saved).toBeInstanceOf(DiscussionThread);
  });

  it('findById returns mapped thread or null', async () => {
    const prisma = makePrisma();
    const thread = createThread();
    prisma.community_DiscussionThread.findUnique
      .mockResolvedValueOnce(asRecord(thread))
      .mockResolvedValueOnce(null);
    const repo = new PrismaDiscussionThreadRepository(prisma as never);

    await expect(repo.findById('thread-1')).resolves.toBeInstanceOf(DiscussionThread);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findDuplicates queries by author/topic/date and maps results', async () => {
    const prisma = makePrisma();
    const thread = createThread();
    prisma.community_DiscussionThread.findMany.mockResolvedValue([asRecord(thread)]);
    const repo = new PrismaDiscussionThreadRepository(prisma as never);

    const result = await repo.findDuplicates('retained customers', 'author-1', 24);

    expect(prisma.community_DiscussionThread.findMany).toHaveBeenCalledWith({
      where: {
        authorId: 'author-1',
        topic: { contains: 'retained customers', mode: 'insensitive' },
        createdAt: { gte: expect.any(Date) }
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(DiscussionThread);
  });

  it('returns user response count from thread answer table', async () => {
    const prisma = makePrisma();
    prisma.community_ThreadAnswer.count.mockResolvedValue(5);
    const repo = new PrismaDiscussionThreadRepository(prisma as never);

    const count = await repo.getUserResponseCount('thread-2', 'user-2');

    expect(prisma.community_ThreadAnswer.count).toHaveBeenCalledWith({
      where: {
        threadId: 'thread-2',
        authorId: 'user-2'
      }
    });
    expect(count).toBe(5);
  });
});

