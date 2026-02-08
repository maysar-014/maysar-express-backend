import { PrismaUserRepository } from '../prisma-user.repository';

function makePrismaMock() {
  const now = new Date();
  const userData = {
    id: 'u1',
    email: 'u1@example.com',
    phoneNumber: '+255712345678',
    firstName: 'A',
    lastName: 'B',
    dateOfBirth: null,
    role: 'buyer',
    language: 'en',
    timezone: 'UTC',
    createdAt: now,
    updatedAt: now,
    failedLoginAttempts: 0,
    status: 'active'
  } as any;

  const prisma: any = {
    user_User: {
      findUnique: jest.fn().mockResolvedValue(userData),
      findFirst: jest.fn().mockResolvedValue(userData),
      create: jest.fn().mockResolvedValue(userData),
      update: jest.fn().mockResolvedValue(userData),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([userData]),
      count: jest.fn().mockResolvedValue(1),
      groupBy: jest.fn().mockResolvedValue([{ status: 'active', _count: { status: 1 } }])
    },
    user_UserAddress: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'a1', userId: 'u1', type: 'home', street: 's', city: 'c', country: 'Tz', isDefault: false, createdAt: now, updatedAt: now }),
      update: jest.fn().mockResolvedValue({ id: 'a1', userId: 'u1', type: 'home', street: 's', city: 'c', country: 'Tz', isDefault: false, createdAt: now, updatedAt: now }),
      updateMany: jest.fn().mockResolvedValue({})
    },
    user_AuditLog: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([{ date: '2020-01-01', count: BigInt(2) }]),
    $transaction: jest.fn().mockImplementation(async (cb: any) => cb({}))
  };

  return { prisma, userData };
}

describe('PrismaUserRepository (partial)', () => {
  test('findById, findByEmail, findByPhoneNumber and create/update map to domain', async () => {
    const { prisma } = makePrismaMock();
    const repo = new PrismaUserRepository(prisma as any);

    const byId = await repo.findById('u1');
    expect(byId).toBeDefined();
    expect(byId?.id).toBe('u1');

    const byEmail = await repo.findByEmail('u1@example.com');
    expect(byEmail?.id).toBe('u1');

    const byPhone = await repo.findByPhoneNumber('+255712345678');
    expect(byPhone?.id).toBe('u1');

    const created = await repo.create(byId as any);
    expect(created.id).toBe('u1');

    const updated = await repo.update(created as any);
    expect(updated.id).toBe('u1');
  });

  test('emailExists, phoneExists, search, findAll and count', async () => {
    const { prisma } = makePrismaMock();
    const repo = new PrismaUserRepository(prisma as any);

    expect(await repo.emailExists('x')).toBe(true);
    expect(await repo.phoneExists('x')).toBe(true);

    const found = await repo.search('a');
    expect(Array.isArray(found)).toBe(true);

    const all = await repo.findAll(0, 10);
    expect(all.length).toBeGreaterThanOrEqual(1);

    expect(await repo.count()).toBeGreaterThanOrEqual(0);
  });

  test('getUserPreferences and exportUserData call underlying prisma and return shapes', async () => {
    const { prisma } = makePrismaMock();
    // ensure findUnique returns a user for preferences
    prisma.user_User.findUnique.mockResolvedValueOnce({ language: 'sw', timezone: 'TZS' });
    const repo = new PrismaUserRepository(prisma as any);

    const prefs = await repo.getUserPreferences('u1');
    expect(prefs.language).toBe('sw');

    // for exportUserData, mock findById via prisma.user.findUnique used in findById
    prisma.user_User.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'u1@example.com', phoneNumber: '+255712345678', firstName: 'A', lastName: 'B', role: 'buyer', language: 'en', timezone: 'UTC', createdAt: new Date(), updatedAt: new Date() });
    prisma.user_UserAddress.findMany.mockResolvedValueOnce([]);
    prisma.user_AuditLog.findMany.mockResolvedValueOnce([]);

    const exported = await repo.exportUserData('u1');
    expect(exported.user.id).toBe('u1');
    expect(Array.isArray(exported.addresses)).toBe(true);
  });
});
