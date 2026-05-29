import { PrismaUserIndexRepository } from './prisma-user-index.repository';

describe('PrismaUserIndexRepository', () => {
  it('upserts indexes with the composite key and value payload', async () => {
    const prisma = {
      auth_UserIndex: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn(),
        deleteMany: jest.fn()
      }
    };
    const repository = new PrismaUserIndexRepository(prisma as never);

    await repository.upsertIndex({
      userId: 'user-1',
      indexType: 'phone',
      value: '+255700000001'
    });

    expect(prisma.auth_UserIndex.upsert).toHaveBeenCalledWith({
      where: {
        userId_indexType: {
          userId: 'user-1',
          indexType: 'phone'
        }
      },
      update: { value: '+255700000001' },
      create: {
        userId: 'user-1',
        indexType: 'phone',
        value: '+255700000001'
      }
    });
  });

  it('finds indexes by value and deletes all indexes for a user', async () => {
    const prisma = {
      auth_UserIndex: {
        upsert: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({
          userId: 'user-1',
          indexType: 'phone',
          value: '+255700000001',
          createdAt: new Date('2026-05-01T00:00:00.000Z')
        }),
        deleteMany: jest.fn().mockResolvedValue(undefined)
      }
    };
    const repository = new PrismaUserIndexRepository(prisma as never);

    const found = await repository.findByValue('phone', '+255700000001');
    await repository.deleteByUserId('user-1');

    expect(found).toEqual({
      userId: 'user-1',
      indexType: 'phone',
      value: '+255700000001',
      createdAt: new Date('2026-05-01T00:00:00.000Z')
    });
    expect(prisma.auth_UserIndex.findFirst).toHaveBeenCalledWith({
      where: {
        indexType: 'phone',
        value: '+255700000001'
      }
    });
    expect(prisma.auth_UserIndex.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' }
    });
  });
});
