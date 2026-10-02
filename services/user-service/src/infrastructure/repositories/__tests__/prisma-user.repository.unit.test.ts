import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../prisma-user.repository';

describe('PrismaUserRepository unit tests (mocked prisma)', () => {
  const mockPrisma: Partial<Record<string, any>> = {};
  let repo: PrismaUserRepository;

  beforeEach(() => {
    // reset mocks
    for (const k of Object.keys(mockPrisma)) {
      if (mockPrisma[k] && mockPrisma[k].mockClear) mockPrisma[k].mockClear();
    }
  });

  function makeRepo(prismaOverrides: Partial<Record<string, any>> = {}) {
    const prisma: any = {
      user_User: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      user_UserAddress: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn()
      },
      user_AuditLog: { findMany: jest.fn(), create: jest.fn() },
      // Prisma $queryRaw always resolves an array, never undefined. A bare
      // jest.fn() returned undefined, which the repository then indexed as rows[0].
      $queryRaw: jest.fn().mockResolvedValue([])
    };

    Object.assign(prisma, prismaOverrides);
    return new PrismaUserRepository(prisma as unknown as PrismaClient, { encrypt: jest.fn((v) => v), decrypt: jest.fn((v) => v) } as any);
  }

  it('findById -> maps to domain user when found', async () => {
    const userData = {
      id: 'u1',
      email: 'a@b.com',
      phoneNumber: '+15551234567',
      firstName: 'A',
      lastName: 'B',
      role: 'buyer',
      status: 'active',
      language: 'en',
      timezone: 'UTC'
    };

    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(userData) } });
    const found = await repo.findById('u1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('u1');
    expect(found!.email.value).toBe('a@b.com');
  });

  it('findById -> returns null when not found', async () => {
    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(null) } });
    const res = await repo.findById('missing');
    expect(res).toBeNull();
  });

  it('recordFailedLogin -> throws when user missing and locks when threshold reached', async () => {
    // missing user should cause error
    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(repo.recordFailedLogin('missing')).rejects.toThrow('User not found');

    // when attempts reach threshold should lock
    const user = { id: 'u2', failedLoginAttempts: 4, status: 'active' };
    const updateSpy = jest.fn().mockResolvedValue(true);
    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(user), update: updateSpy } });
    await expect(repo.recordFailedLogin('u2')).resolves.toBeUndefined();
    expect(updateSpy).toHaveBeenCalled();
  });

  it('createUserAddress -> sets default address when isDefault true', async () => {
    const created = { id: 'a1', userId: 'u1', isDefault: true, street: 's', city: 'c', country: 'X', createdAt: new Date(), updatedAt: new Date() };
    const ua = {
      create: jest.fn().mockResolvedValue(created),
      updateMany: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue(created)
    };

    repo = makeRepo({ user_UserAddress: ua });
    const addr = await repo.createUserAddress('u1', { type: 'home' as any, street: 's', city: 'c', country: 'X', isDefault: true });
    expect(addr.id).toBe('a1');
    expect(ua.create).toHaveBeenCalled();
    expect(ua.updateMany).toHaveBeenCalled();
    expect(ua.update).toHaveBeenCalled();
  });

  it('getUserPreferences -> throws when user not found', async () => {
    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(repo.getUserPreferences('uX')).rejects.toThrow('User not found');
  });

  it('exportUserData -> throws when user missing', async () => {
    repo = makeRepo({ user_User: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(repo.exportUserData('nope')).rejects.toThrow('User not found');
  });

  it('getHealthStatus -> returns unhealthy when db throws', async () => {
    repo = makeRepo({ user_User: { count: jest.fn().mockRejectedValue(new Error('db down')) } });
    const res = await repo.getHealthStatus();
    expect(res.status).toBe('unhealthy');
    expect(res.details.database.connected).toBe(false);
  });

  it('formatError private helper works for Error and primitives', () => {
    repo = makeRepo();
    // access private via any
    const fmt = (repo as any).formatError;
    expect(fmt(new Error('oh'))).toBe('oh');
    expect(fmt('plain')).toBe('plain');
  });
});
