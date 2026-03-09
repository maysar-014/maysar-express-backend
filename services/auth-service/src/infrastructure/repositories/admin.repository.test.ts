const mockLoggerError = jest.fn();

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
  });

  it('returns user profile by id', async () => {
    const user = await repository.getUserById('user-1');
    expect(user).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'buyer',
        status: 'active',
        permissions: ['read', 'write']
      })
    );
  });

  it('updates user status and role', async () => {
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
