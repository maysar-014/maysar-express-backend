import { PrismaEmailVerificationRepository } from './prisma-email-verification.repository';

describe('PrismaEmailVerificationRepository', () => {
  it('creates, finds, marks used, and deletes expired tokens', async () => {
    const prisma = {
      auth_EmailVerificationToken: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue({
          id: 'token-1',
          userId: 'user-1',
          token: 'verify-token',
          expiresAt: new Date('2026-05-30T00:00:00.000Z'),
          used: false
        }),
        update: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 })
      }
    };
    const repository = new PrismaEmailVerificationRepository(prisma as never);
    const expiresAt = new Date('2026-05-30T00:00:00.000Z');

    await repository.create({
      id: 'token-1',
      userId: 'user-1',
      token: 'verify-token',
      expiresAt
    });

    const found = await repository.findByToken('verify-token');
    await repository.markAsUsed('token-1');
    const deleted = await repository.deleteExpired();

    expect(prisma.auth_EmailVerificationToken.create).toHaveBeenCalledWith({
      data: {
        id: 'token-1',
        userId: 'user-1',
        token: 'verify-token',
        expiresAt
      }
    });
    expect(found).toEqual({
      id: 'token-1',
      userId: 'user-1',
      token: 'verify-token',
      expiresAt,
      used: false
    });
    expect(prisma.auth_EmailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { used: true }
    });
    expect(prisma.auth_EmailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } }
    });
    expect(deleted).toBe(3);
  });
});
