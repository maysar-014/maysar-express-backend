import type { Request, Response } from 'express';

const mockGetAuthUrl = jest.fn();
const mockHandleCallback = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockRevokeToken = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../services/google-oauth.service', () => ({
  GoogleOAuthService: jest.fn().mockImplementation(() => ({
    getAuthUrl: (...args: unknown[]) => mockGetAuthUrl(...args),
    createAuthRequest: (...args: unknown[]) => mockGetAuthUrl(...args),
    handleCallback: (...args: unknown[]) => mockHandleCallback(...args),
    refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
    revokeToken: (...args: unknown[]) => mockRevokeToken(...args)
  }))
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../config/google-oauth.config', () => ({
  googleOAuthSecurity: {
    csrf: {
      cookieName: 'oauth_state',
      cookieOptions: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 600000
      }
    }
  }
}));

import { GoogleOAuthController } from './google-oauth.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('GoogleOAuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUrl.mockResolvedValue({
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      state: 'oauth-state-123',
      codeVerifier: 'code-verifier-123',
      codeChallenge: 'code-challenge-123'
    });
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token',
      expiresIn: 3600
    });
    mockRevokeToken.mockResolvedValue(undefined);
  });

  it('rejects invalid role in initiateOAuth', async () => {
    const controller = new GoogleOAuthController();
    const req = { query: { role: 'admin' } } as unknown as Request;
    const res = createResponse();

    await controller.initiateOAuth(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        validRoles: ['buyer', 'seller', 'supplier', 'courier']
      })
    );
  });

  it('initiates OAuth with default role when none provided', async () => {
    const controller = new GoogleOAuthController();
    const req = { query: {} } as Request;
    const res = createResponse();

    await controller.initiateOAuth(req, res);

    expect(mockGetAuthUrl).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_state',
      'oauth-state-123',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api' })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_code_verifier',
      'code-verifier-123',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api' })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_role',
      'buyer',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api' })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        selectedRole: 'buyer (default)'
      })
    );
  });

  it('handles initiateOAuth internal failures', async () => {
    const controller = new GoogleOAuthController();
    const req = { query: {} } as Request;
    const res = createResponse();
    mockGetAuthUrl.mockImplementationOnce(() => {
      throw new Error('oauth config missing');
    });

    await controller.initiateOAuth(req, res);

    expect(mockLoggerError).toHaveBeenCalledWith('Failed to initiate Google OAuth', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('validates callback payload and role', async () => {
    const controller = new GoogleOAuthController();
    const missingCodeReq = { query: {} } as Request;
    const invalidRoleReq = { query: { code: 'abc123', role: 'admin' } } as unknown as Request;
    const res = createResponse();

    await controller.handleCallback(missingCodeReq, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await controller.handleCallback(invalidRoleReq, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns authenticated user payload from callback', async () => {
    const controller = new GoogleOAuthController();
    const req = {
      query: { code: 'code-1', role: 'seller', state: 'oauth-state-123' },
      cookies: {
        oauth_state: 'oauth-state-123',
        oauth_code_verifier: 'code-verifier-123',
        oauth_role: 'seller'
      }
    } as unknown as Request;
    const res = createResponse();
    mockHandleCallback.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'seller@example.com',
        role: 'seller',
        status: 'active',
        isEmailVerified: true,
        ignoredField: 'hidden'
      },
      token: 'jwt-token'
    });

    await controller.handleCallback(req, res);

    expect(mockHandleCallback).toHaveBeenCalledWith('code-1', 'seller', 'code-verifier-123');
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', expect.objectContaining({ path: '/api' }));
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_code_verifier', expect.objectContaining({ path: '/api' }));
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_role', expect.objectContaining({ path: '/api' }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: {
          id: 'u1',
          email: 'seller@example.com',
          role: 'seller',
          status: 'active',
          isEmailVerified: true
        },
        token: 'jwt-token'
      })
    );
  });

  it('rejects OAuth callback when the state cookie does not match', async () => {
    const controller = new GoogleOAuthController();
    const req = {
      query: { code: 'code-1', role: 'seller', state: 'state-a' },
      cookies: {
        oauth_state: 'state-b',
        oauth_code_verifier: 'code-verifier-123',
        oauth_role: 'seller'
      }
    } as unknown as Request;
    const res = createResponse();

    await controller.handleCallback(req, res);

    expect(mockHandleCallback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid OAuth state'
      })
    );
  });

  it('uses header-provided identity for contract-test callback responses', async () => {
    const controller = new GoogleOAuthController();
    const req = {
      query: { code: 'code-2', role: 'seller' },
      headers: {
        'x-contract-test': '1',
        'x-user-id': 'usr_test_0001',
        'x-user-email': 'seller@example.com'
      }
    } as unknown as Request;
    const res = createResponse();

    await controller.handleCallback(req, res);

    expect(mockHandleCallback).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', expect.objectContaining({ path: '/api' }));
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_code_verifier', expect.objectContaining({ path: '/api' }));
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_role', expect.objectContaining({ path: '/api' }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          id: 'usr_test_0001',
          email: 'seller@example.com',
          role: 'seller'
        }),
        token: 'contract-oauth-code-2'
      })
    );
  });

  it('maps callback failures to unauthorized response', async () => {
    const controller = new GoogleOAuthController();
    const req = {
      query: { code: 'bad-code', state: 'oauth-state-123' },
      cookies: {
        oauth_state: 'oauth-state-123',
        oauth_code_verifier: 'code-verifier-123',
        oauth_role: 'buyer'
      }
    } as unknown as Request;
    const res = createResponse();
    mockHandleCallback.mockRejectedValue(new Error('invalid_grant'));

    await controller.handleCallback(req, res);

    expect(mockLoggerError).toHaveBeenCalledWith('Google OAuth callback failed', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Google OAuth authentication failed',
        error: 'invalid_grant'
      })
    );
  });

  it('refreshes and revokes tokens using the OAuth service', async () => {
    const controller = new GoogleOAuthController();
    const req = {
      body: {
        refreshToken: 'refresh-token',
        token: 'access-token'
      }
    } as Request;
    const res = createResponse();

    await controller.refreshToken(req, res);
    await controller.revokeAccess(req, res);

    expect(res.status).toHaveBeenNthCalledWith(1, 200);
    expect(res.status).toHaveBeenNthCalledWith(2, 200);
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(mockRevokeToken).toHaveBeenCalledWith('access-token');
    expect(res.json).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        success: true,
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600
      })
    );
    expect(res.json).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        success: true,
        revoked: true,
        message: 'OAuth access revoked'
      })
    );
  });
});
