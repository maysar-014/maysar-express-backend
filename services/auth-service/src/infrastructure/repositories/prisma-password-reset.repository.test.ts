import { PrismaPasswordResetRepository } from './prisma-password-reset.repository';

describe('PrismaPasswordResetRepository', () => {
  it('creates, finds, marks used, and deletes expired tokens', async () => {
    const prisma = {
      auth_PasswordResetToken: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue({
          id: 'token-1',
          userId: 'user-1',
          token: 'reset-token',
          expiresAt: new Date('2026-05-30T00:00:00.000Z'),
          used: false
        }),
        update: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 })
      }
    };
    const repository = new PrismaPasswordResetRepository(prisma as never);
    const expiresAt = new Date('2026-05-30T00:00:00.000Z');

    await repository.create({
      id: 'token-1',
      userId: 'user-1',
      token: 'reset-token',
      expiresAt
    });

    const found = await repository.findByToken('reset-token');
    await repository.markAsUsed('token-1');
    const deleted = await repository.deleteExpired();

    expect(prisma.auth_PasswordResetToken.create).toHaveBeenCalledWith({
      data: {
        id: 'token-1',
        userId: 'user-1',
        token: 'reset-token',
        expiresAt
      }
    });
    expect(found).toEqual({
      id: 'token-1',
      userId: 'user-1',
      token: 'reset-token',
      expiresAt,
      used: false
    });
    expect(prisma.auth_PasswordResetToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { used: true }
    });
    expect(prisma.auth_PasswordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } }
    });
    expect(deleted).toBe(2);
  });
});
