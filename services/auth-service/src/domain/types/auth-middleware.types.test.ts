import type {
  ApiKeyValidationResult,
  ApiResponse,
  AuthenticationFailureData,
  BruteForceResult,
  DeviceTrackingResult,
  MetricsResult,
  SessionData,
  SessionResult,
  TokenBlacklistResult,
  TokenValidationResult
} from './auth-middleware.types';

describe('auth middleware types', () => {
  it('supports success and error api responses', () => {
    const success: ApiResponse<{ token: string }> = {
      success: true,
      data: { token: 'jwt' },
      message: 'authenticated'
    };

    const failure: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token expired'
      }
    };

    expect(success.data?.token).toBe('jwt');
    expect(failure.error?.code).toBe('INVALID_TOKEN');
  });

  it('supports token, device, session, and metrics contract shapes', () => {
    const token: TokenValidationResult = {
      valid: true,
      payload: { sub: 'user-1' },
      expiresAt: 1700000000,
      issuedAt: 1699990000
    };
    const blacklist: TokenBlacklistResult = { isBlacklisted: false };
    const apiKey: ApiKeyValidationResult = { valid: true, serviceId: 'svc-auth' };
    const bruteForce: BruteForceResult = { isBlocked: false, attempts: 1, timeUntilReset: 60 };
    const device: DeviceTrackingResult = {
      userId: 'user-1',
      deviceId: 'device-1',
      deviceInfo: { platform: 'ios' },
      firstSeen: 1,
      lastSeen: 2,
      isNewDevice: true,
      locationHistory: [{ timestamp: 1, location: 'TZ', ipAddress: '127.0.0.1' }],
      riskScore: 0.2
    };
    const session: SessionResult = {
      sessionId: 's-1',
      userId: 'user-1',
      createdAt: 1,
      lastActivity: 2,
      expiresAt: 3
    };
    const metrics: MetricsResult = {
      timestamp: Date.now(),
      activeSessions: 3
    };
    const failureData: AuthenticationFailureData = {
      identifier: 'user@example.com',
      type: 'email',
      reason: 'invalid password'
    };
    const sessionData: SessionData = {
      sessionId: 's-1',
      userId: 'user-1',
      createdAt: 1,
      lastActivity: 2,
      expiresAt: 3
    };

    expect(token.valid).toBe(true);
    expect(blacklist.isBlacklisted).toBe(false);
    expect(apiKey.serviceId).toBe('svc-auth');
    expect(bruteForce.attempts).toBe(1);
    expect(device.locationHistory[0].location).toBe('TZ');
    expect(session.sessionId).toBe('s-1');
    expect(metrics.activeSessions).toBe(3);
    expect(failureData.type).toBe('email');
    expect(sessionData.userId).toBe('user-1');
  });
});
