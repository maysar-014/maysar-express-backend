import { PrismaUserRepository } from '../prisma-user.repository';

function basePrisma() {
  const base: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    userAddress: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn()
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn()
  };
  return base;
}

describe('PrismaUserRepository error paths', () => {
  test('handles primitive rejections and errors in many methods', async () => {
    const p = basePrisma();
    // Make various methods reject with a primitive to hit formatError non-Error path
    p.user.findUnique.mockRejectedValue('boom');
    p.user.findFirst.mockRejectedValue('boom');
    p.user.create.mockRejectedValue(new Error('create-fail'));
    p.user.update.mockRejectedValue('update-fail');
    p.user.delete.mockRejectedValue('delete-fail');
    p.user.findMany.mockRejectedValue('findMany-fail');
    p.user.count.mockRejectedValue('count-fail');
    p.user.groupBy.mockRejectedValue('groupby-fail');

    p.userAddress.findMany.mockRejectedValue('addr-find-fail');
    p.userAddress.create.mockRejectedValue('addr-create-fail');
    p.userAddress.update.mockRejectedValue('addr-update-fail');
    p.userAddress.delete.mockRejectedValue('addr-delete-fail');

    p.auditLog.findMany.mockRejectedValue('audit-find-fail');
    p.auditLog.create.mockRejectedValue('audit-create-fail');

    p.$queryRaw.mockRejectedValue('queryraw-fail');

    const repo = new PrismaUserRepository(p as any, { encrypt: jest.fn((v) => v), decrypt: jest.fn((v) => v) } as any);

    await expect(repo.findById('x')).rejects.toBeDefined();
    await expect(repo.findByEmail('e')).rejects.toBeDefined();
    await expect(repo.findByPhoneNumber('p')).rejects.toBeDefined();
    await expect(repo.create({} as any)).rejects.toBeDefined();
    await expect(repo.update({ id: 'x' } as any)).rejects.toBeDefined();
    await expect(repo.delete('x')).rejects.toBeDefined();
    await expect(repo.search('q')).rejects.toBeDefined();
    await expect(repo.emailExists('e')).rejects.toBeDefined();
    await expect(repo.phoneExists('p')).rejects.toBeDefined();
    await expect(repo.findByStatus('active' as any)).rejects.toBeDefined();
    await expect(repo.findByRole('buyer' as any)).rejects.toBeDefined();
    await expect(repo.findAll(0, 10)).rejects.toBeDefined();
    await expect(repo.count()).rejects.toBeDefined();
    await expect(repo.getUserCountByStatus()).rejects.toBeDefined();

    await expect(repo.getUserRegistrationStats(new Date(), new Date())).rejects.toBeDefined();

    await expect(repo.updatePassword('x', 'h')).rejects.toBeDefined();
    await expect(repo.updateStatus('x', 'active' as any)).rejects.toBeDefined();
    await expect(repo.updateEmailVerification('x', true)).rejects.toBeDefined();
    await expect(repo.updatePhoneVerification('x', true)).rejects.toBeDefined();
    await expect(repo.recordSuccessfulLogin('x')).rejects.toBeDefined();

    // recordFailedLogin uses findUnique then update - make findUnique throw
    p.user.findUnique.mockRejectedValueOnce('boom2');
    await expect(repo.recordFailedLogin('x')).rejects.toBeDefined();

    await expect(repo.updateRole('x', 'seller' as any)).rejects.toBeDefined();

    await expect(repo.getUserAddresses('x')).rejects.toBeDefined();
    await expect(repo.createUserAddress('x', { type: 'home' as any, street: 's', city: 'c', country: 'c', isDefault: false })).rejects.toBeDefined();
    await expect(repo.updateUserAddress('x', 'a', {})).rejects.toBeDefined();
    await expect(repo.deleteUserAddress('x', 'a')).rejects.toBeDefined();
    await expect(repo.setDefaultAddress('x', 'a')).rejects.toBeDefined();

    await expect(repo.getUserPreferences('x')).rejects.toBeDefined();
    await expect(repo.updateUserPreferences('x', {})).rejects.toBeDefined();

    await expect(repo.bulkUpdateStatus(['x'], 'active' as any)).resolves.toBeDefined();
    // bulkDelete will call delete and should report failures
    await expect(repo.bulkDelete(['x'])).resolves.toBeDefined();

    await expect(repo.getUserSecurityEvents('x')).rejects.toBeDefined();
    await expect(repo.recordSecurityEvent('x', { action: 'a', success: true })).rejects.toBeDefined();

    await expect(repo.exportUserData('x')).rejects.toBeDefined();

    await expect(repo.getHealthStatus()).resolves.toBeDefined();
  });
});
