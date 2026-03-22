import type { Request, Response } from 'express';

const mockGetAuthUrl = jest.fn();
const mockHandleCallback = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../services/google-oauth.service', () => ({
  GoogleOAuthService: jest.fn().mockImplementation(() => ({
    getAuthUrl: (...args: unknown[]) => mockGetAuthUrl(...args),
    handleCallback: (...args: unknown[]) => mockHandleCallback(...args)
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

import { GoogleOAuthController } from './google-oauth.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('GoogleOAuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth');
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
    const req = { query: { code: 'code-1', role: 'seller' } } as unknown as Request;
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

    expect(mockHandleCallback).toHaveBeenCalledWith('code-1', 'seller');
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
    const req = { query: { code: 'bad-code' } } as unknown as Request;
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

  it('returns not-implemented responses for refresh/revoke endpoints', async () => {
    const controller = new GoogleOAuthController();
    const req = {} as Request;
    const res = createResponse();

    await controller.refreshToken(req, res);
    await controller.revokeAccess(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false
      })
    );
  });
});
