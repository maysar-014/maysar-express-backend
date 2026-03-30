import { PrismaUserRepository } from '../prisma-user.repository';

function makePrismaMock() {
  const now = new Date();
  const userData: any = {
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
  };

  const prisma: any = {
    user_UserIndex: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue({ userId: 'u1' }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    user_User: {
      findUnique: jest.fn().mockResolvedValue(userData),
      findFirst: jest.fn().mockResolvedValue(userData),
      create: jest.fn().mockResolvedValue(userData),
      update: jest.fn().mockImplementation(async (args: any) => {
        if (args.where && args.where.id === 'bad') throw new Error('update failed');
        return { ...userData, ...args.data };
      }),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([userData]),
      count: jest.fn().mockResolvedValue(1),
      groupBy: jest.fn().mockResolvedValue([{ status: 'active', _count: { status: 1 } }])
    },
    user_UserAddress: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'a1', userId: 'u1', type: 'home', street: 's', city: 'c', country: 'Tz', isDefault: false, createdAt: now, updatedAt: now }),
      update: jest.fn().mockResolvedValue({ id: 'a1', userId: 'u1', type: 'home', street: 's', city: 'c', country: 'Tz', isDefault: false, createdAt: now, updatedAt: now }),
      updateMany: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    },
    user_AuditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'e1' })
    },
    $queryRaw: jest.fn().mockResolvedValue([{ date: '2020-01-01', count: BigInt(2) }]),
    $transaction: jest.fn().mockImplementation(async (cb: any) => cb({}))
  };

  return { prisma, userData };
}

describe('PrismaUserRepository more methods', () => {
  test('search, queries, analytics, security and bulk operations', async () => {
    const { prisma, userData } = makePrismaMock();
    const repo = new PrismaUserRepository(prisma as any, {
      encrypt: jest.fn((v) => v),
      decrypt: jest.fn((v) => v),
      hash: jest.fn((v) => v)
    } as any);

    // search
    const found = await repo.search('u1', 10, 0);
    expect(found[0]!.id).toBe('u1');

    // email/phone exists
    expect(await repo.emailExists('u1@example.com')).toBe(true);
    expect(await repo.phoneExists('+255712345678')).toBe(true);

    // findByStatus / role / all / count
    const byStatus = await repo.findByStatus('active' as any);
    expect(byStatus.length).toBeGreaterThan(0);
    const byRole = await repo.findByRole('buyer' as any);
    expect(byRole.length).toBeGreaterThan(0);
    const all = await repo.findAll(0, 10);
    expect(all.length).toBeGreaterThan(0);
    expect(await repo.count()).toBeGreaterThanOrEqual(0);

    // getUserCountByStatus
    const counts = await repo.getUserCountByStatus();
    expect(typeof counts['active']).toBe('number');

    // getUserRegistrationStats
    prisma.user_User.groupBy.mockResolvedValueOnce([{ role: 'buyer', _count: { role: 1 } }]);
    const stats = await repo.getUserRegistrationStats(new Date('2020-01-01'), new Date('2020-12-31'));
    expect(stats.totalRegistrations).toBeDefined();

    // security operations
    await expect(repo.updatePassword('u1', 'hash')).resolves.toBeUndefined();
    await expect(repo.updateStatus('u1', 'active' as any)).resolves.toBeUndefined();
    await expect(repo.updateEmailVerification('u1', true)).resolves.toBeUndefined();
    await expect(repo.updatePhoneVerification('u1', true)).resolves.toBeUndefined();
    await expect(repo.recordSuccessfulLogin('u1')).resolves.toBeUndefined();

    // recordFailedLogin: normal path
    prisma.user_User.findUnique.mockResolvedValueOnce({ ...userData, failedLoginAttempts: 1, status: 'active' });
    await expect(repo.recordFailedLogin('u1')).resolves.toBeUndefined();

    // recordFailedLogin: user not found -> should throw
    prisma.user_User.findUnique.mockResolvedValueOnce(null);
    await expect(repo.recordFailedLogin('missing')).rejects.toThrow();

    // role update
    await expect(repo.updateRole('u1', 'seller' as any)).resolves.toBeUndefined();

    // address operations
    const addrs = await repo.getUserAddresses('u1');
    expect(Array.isArray(addrs)).toBe(true);
    const created = await repo.createUserAddress('u1', { type: 'home' as any, street: 's', city: 'c', country: 'Tz', isDefault: false });
    expect(created.id).toBe('a1');
    const updated = await repo.updateUserAddress('u1', 'a1', { street: 'new' });
    expect(updated.id).toBe('a1');
    await expect(repo.deleteUserAddress('u1', 'a1')).resolves.toBeUndefined();
    await expect(repo.setDefaultAddress('u1', 'a1')).resolves.toBeUndefined();

    // preferences
    prisma.user_User.findUnique.mockResolvedValueOnce({ language: 'sw', timezone: 'TZS' });
    const prefs = await repo.getUserPreferences('u1');
    expect(prefs.language).toBe('sw');
    await expect(repo.updateUserPreferences('u1', { language: 'en' })).resolves.toBeDefined();

    // bulk ops: simulate one failure by making prisma.user.update throw for id 'bad'
    const resultsStatus = await repo.bulkUpdateStatus(['u1', 'bad'], 'active' as any);
    expect(resultsStatus.successCount).toBeGreaterThanOrEqual(1);

    // bulk delete: simulate delete throws for 'bad'
    prisma.user_User.delete.mockImplementationOnce(async (args: any) => { if (args.where.id === 'bad') throw new Error('delete failed'); return {}; });
    const resultsDel = await repo.bulkDelete(['u1', 'bad']);
    expect(resultsDel.successCount).toBeGreaterThanOrEqual(1);

    // security events
    const events = await repo.getUserSecurityEvents('u1');
    expect(Array.isArray(events)).toBe(true);
    await expect(repo.recordSecurityEvent('u1', { action: 'a', success: true })).resolves.toBeUndefined();

    // exportUserData
    prisma.user_AuditLog.findMany.mockResolvedValueOnce([]);
    const exported = await repo.exportUserData('u1');
    expect(exported.user.id).toBe('u1');

    // health status healthy
    prisma.user_User.count.mockResolvedValueOnce(1);
    const health = await repo.getHealthStatus();
    expect(health.status).toMatch(/healthy|degraded/);

    // health status unhealthy (simulate error)
    prisma.user_User.count.mockImplementationOnce(() => { throw new Error('db down'); });
    const badHealth = await repo.getHealthStatus();
    expect(badHealth.status).toBe('unhealthy');

    // cleanupOldData (no-op)
    const cleanup = await repo.cleanupOldData(30);
    expect(cleanup.deletedUsers).toBe(0);
  });
});
