import type {
  AuthResponse,
  ErrorResponse,
  HealthResponse,
  LoginRequest,
  ManageUserStatusRequest,
  UserResponse
} from './auth.dto';
import { UserRole, UserStatus } from '../../domain/entities/user.entity';

describe('auth dto types', () => {
  it('supports login and auth response shapes used by handlers', () => {
    const loginRequest: LoginRequest = {
      email: 'admin@example.com',
      password: 'secure-password',
      rememberMe: true,
      totpCode: '123456'
    };

    const user: UserResponse = {
      id: 'user-1',
      email: loginRequest.email,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: false,
      twoFactorEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    const response: AuthResponse = {
      success: true,
      message: 'Authenticated',
      user,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900
    };

    expect(response.success).toBe(true);
    expect(response.user?.role).toBe(UserRole.ADMIN);
    expect(response.expiresIn).toBe(900);
  });

  it('supports admin action unions and standard error/health response contracts', () => {
    const statusAction: ManageUserStatusRequest['action'] = 'unlock';

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'ValidationError',
      message: 'Input is invalid',
      code: 'VALIDATION_FAILED',
      timestamp: '2026-01-01T00:00:00.000Z'
    };

    const healthResponse: HealthResponse = {
      service: 'auth-service',
      status: 'healthy',
      timestamp: '2026-01-01T00:00:00.000Z',
      version: '1.0.0',
      uptime: 120,
      database: { status: 'connected', latency: 4 },
      cache: { status: 'connected', latency: 2 },
      messaging: { status: 'connected' }
    };

    expect(statusAction).toBe('unlock');
    expect(errorResponse.success).toBe(false);
    expect(healthResponse.database.status).toBe('connected');
  });
});
