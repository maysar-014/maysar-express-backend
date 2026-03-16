import { UserRole, UserStatus, type AuthUser } from '../../domain/entities/user.types';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

jest.mock('../services/logger.service', () => ({
  logger: mockLogger
}));

import { UserServiceRepository } from './user-service.repository';

const createUserData = () => ({
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.BUYER,
  status: UserStatus.ACTIVE,
  isEmailVerified: true,
  isPhoneVerified: true,
  twoFactorEnabled: true,
  twoFactorSecret: 'totp-secret',
  failedLoginAttempts: 2,
  lockoutUntil: '2026-03-08T12:00:00.000Z',
  lastLoginAt: '2026-03-08T10:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-08T10:30:00.000Z'
});

const createAuthUser = (): AuthUser => ({
  id: 'user-2',
  email: 'save@example.com',
  role: UserRole.SELLER,
  status: UserStatus.ACTIVE,
  isEmailVerified: true,
  isPhoneVerified: false,
  twoFactorEnabled: false,
  failedLoginAttempts: 3,
  lockoutUntil: new Date('2026-03-08T11:00:00.000Z'),
  lastLoginAt: new Date('2026-03-08T09:30:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-08T09:30:00.000Z')
});

describe('UserServiceRepository', () => {
  const client = {
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    emailExists: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findById maps user-service payload to AuthUser', async () => {
    client.findUserById.mockResolvedValue(createUserData());
    const repository = new UserServiceRepository(client as any);

    const result = await repository.findById('user-1');

    expect(client.findUserById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        twoFactorEnabled: true,
        failedLoginAttempts: 2
      })
    );
    expect(result?.lockoutUntil).toBeInstanceOf(Date);
    expect(result?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('findById returns null when user does not exist and throws on client errors', async () => {
    const repository = new UserServiceRepository(client as any);

    client.findUserById.mockResolvedValueOnce(null);
    await expect(repository.findById('missing')).resolves.toBeNull();

    client.findUserById.mockRejectedValueOnce(new Error('upstream unavailable'));
    await expect(repository.findById('user-err')).rejects.toThrow('upstream unavailable');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to find user by ID via User Service',
      expect.objectContaining({ userId: 'user-err' })
    );
  });

  it('findByEmail maps payload, returns null for missing, and throws on lookup errors', async () => {
    const repository = new UserServiceRepository(client as any);

    client.findUserByEmail.mockResolvedValueOnce(createUserData());
    const found = await repository.findByEmail('user@example.com');
    expect(found?.email).toBe('user@example.com');

    client.findUserByEmail.mockResolvedValueOnce(null);
    await expect(repository.findByEmail('missing@example.com')).resolves.toBeNull();

    client.findUserByEmail.mockRejectedValueOnce(new Error('email lookup failed'));
    await expect(repository.findByEmail('boom@example.com')).rejects.toThrow('email lookup failed');
  });

  it('save sends only auth-managed fields and skips update when nothing changed', async () => {
    const repository = new UserServiceRepository(client as any);
    const user = createAuthUser();

    await repository.save(user);
    expect(client.updateUser).toHaveBeenCalledWith('user-2', {
      failedLoginAttempts: 3,
      lockoutUntil: '2026-03-08T11:00:00.000Z',
      lastLoginAt: '2026-03-08T09:30:00.000Z'
    });

    const unchangedUser: AuthUser = {
      ...user,
      failedLoginAttempts: undefined as any,
      lockoutUntil: undefined,
      lastLoginAt: undefined
    };
    await repository.save(unchangedUser);

    expect(client.updateUser).toHaveBeenCalledTimes(1);
  });

  it('save rethrows update failures', async () => {
    const repository = new UserServiceRepository(client as any);
    const user = createAuthUser();
    client.updateUser.mockRejectedValueOnce(new Error('cannot persist'));

    await expect(repository.save(user)).rejects.toThrow('cannot persist');
  });

  it('emailExists returns value on success and throws on errors', async () => {
    const repository = new UserServiceRepository(client as any);

    client.emailExists.mockResolvedValueOnce(true);
    await expect(repository.emailExists('exists@example.com')).resolves.toBe(true);

    client.emailExists.mockRejectedValueOnce(new Error('timeout'));
    await expect(repository.emailExists('error@example.com')).rejects.toThrow('timeout');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to check email existence via User Service',
      expect.objectContaining({ email: 'error@example.com' })
    );
  });
});
