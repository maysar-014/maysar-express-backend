import type { AuthResponse, AuthUser, UserServiceUser } from './user.types';
import { UserRole, UserStatus } from './user.types';

describe('auth user types', () => {
  it('exposes stable role and status enums', () => {
    expect(UserRole.BUYER).toBe('buyer');
    expect(UserRole.SYSTEM).toBe('system');
    expect(UserStatus.ACTIVE).toBe('active');
    expect(UserStatus.LOCKED).toBe('locked');
  });

  it('supports auth and user-service payload contracts', () => {
    const authUser: AuthUser = {
      id: 'user-1',
      email: 'buyer@example.com',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: false,
      twoFactorEnabled: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };

    const userServiceUser: UserServiceUser = {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      status: authUser.status,
      isEmailVerified: authUser.isEmailVerified,
      isPhoneVerified: authUser.isPhoneVerified,
      failedLoginAttempts: authUser.failedLoginAttempts,
      twoFactorEnabled: authUser.twoFactorEnabled,
      language: 'en',
      timezone: 'UTC',
      notificationsEnabled: true,
      createdAt: authUser.createdAt.toISOString(),
      updatedAt: authUser.updatedAt.toISOString()
    };

    const response: AuthResponse = {
      success: true,
      user: authUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      message: 'ok'
    };

    expect(userServiceUser.role).toBe(UserRole.BUYER);
    expect(response.user?.id).toBe('user-1');
  });
});
