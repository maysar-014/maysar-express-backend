const mockLoggerError = jest.fn();

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  session: {
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn()
};

jest.mock('../database/prisma-client', () => ({
  prisma: mockPrisma
}));

jest.mock('../services/logger.service', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { AdminRepository, adminRepository } from './admin.repository';

describe('AdminRepository', () => {
  let repository: AdminRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AdminRepository();
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg(mockPrisma);
    });
  });

  it('returns user profile by id', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      role: 'BUYER',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      lastLoginAt: new Date('2026-03-02T00:00:00.000Z')
    });
    const user = await repository.getUserById('user-1');
    expect(user).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'buyer',
        status: 'active',
        permissions: []
      })
    );
  });

  it('updates user status and role', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 'user-2',
      status: 'SUSPENDED',
      updatedAt: new Date('2026-03-10T00:00:00.000Z')
    });
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 'user-2',
      role: 'SELLER',
      updatedAt: new Date('2026-03-10T00:00:00.000Z')
    });
    const status = await repository.updateUserStatus('user-2', 'suspended', 'policy');
    const role = await repository.updateUserRole('user-2', 'seller');

    expect(status).toEqual(
      expect.objectContaining({
        userId: 'user-2',
        status: 'suspended',
        reason: 'policy'
      })
    );
    expect(role).toEqual(
      expect.objectContaining({
        userId: 'user-2',
        role: 'seller'
      })
    );
  });

  it('searches users and returns paginated payload', async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user123',
        email: 'user1@example.com',
        role: 'BUYER',
        status: 'ACTIVE',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        lastLoginAt: new Date('2026-03-02T00:00:00.000Z')
      }
    ]);
    mockPrisma.user.count.mockResolvedValueOnce(1);
    const result = await repository.searchUsers({
      query: 'user',
      role: 'buyer',
      status: 'active',
      limit: 10,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.users[0]).toEqual(
      expect.objectContaining({
        userId: 'user123',
        role: 'buyer',
        status: 'active'
      })
    );
  });

  it('handles session read and termination operations', async () => {
    mockPrisma.session.findMany.mockResolvedValueOnce([
      {
        id: 'session-1',
        userId: 'user-3',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2026-03-05T00:00:00.000Z'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ]);
    mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 1 });
    const sessions = await repository.getUserSessions('user-3');
    const allTerminated = await repository.terminateUserSessions('user-3');
    const oneTerminated = await repository.terminateSession('session-1');

    expect(sessions[0]).toEqual(
      expect.objectContaining({
        userId: 'user-3',
        isActive: true
      })
    );
    expect(allTerminated).toEqual({ terminatedCount: 1 });
    expect(oneTerminated).toEqual({ terminated: true });
  });

  it('exports singleton repository instance', () => {
    expect(adminRepository).toBeInstanceOf(AdminRepository);
  });
});
