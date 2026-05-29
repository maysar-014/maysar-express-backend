import { PrismaSessionRepository } from './prisma-session.repository';

const buildPrismaMock = () => ({
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('PrismaSessionRepository', () => {
  it('creates and reads sessions through the Prisma session model', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      session: prisma.session,
      user_Session: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    }));
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      token: 'token-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-1',
        token: 'token-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    prisma.session.count.mockResolvedValue(1);

    const repository = new PrismaSessionRepository(prisma as never);

    await repository.create({
      id: 'session-1',
      userId: 'user-1',
      token: 'token-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    await expect(repository.findByToken('token-1')).resolves.toMatchObject({
      id: 'session-1',
      token: 'token-1',
    });
    await expect(repository.findByUserId('user-1')).resolves.toHaveLength(1);
    await expect(repository.countActiveSessions('user-1')).resolves.toBe(1);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('deletes, updates expiration, and removes expired sessions', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      session: prisma.session,
      user_Session: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue(undefined),
      },
    }));
    prisma.session.deleteMany.mockResolvedValue({ count: 2 });
    prisma.session.count.mockResolvedValue(0);

    const repository = new PrismaSessionRepository(prisma as never);

    await repository.deleteByToken('token-1');
    await repository.deleteByUserId('user-1');
    await repository.updateExpiresAt('token-1', new Date('2026-01-03T00:00:00.000Z'));
    await expect(repository.deleteExpired()).resolves.toBe(2);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } }
    });
  });
});
