import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';

const createResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  };
  return res as unknown as Response;
};

const createRequest = (overrides?: Partial<Request>): Request =>
  ({
    body: {},
    cookies: {},
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest-agent'),
    ...overrides
  } as unknown as Request);

describe('AuthController', () => {
  const registerUserUseCase = { execute: jest.fn() };
  const authenticateUserUseCase = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('register returns success payload with created user id', async () => {
    registerUserUseCase.execute.mockResolvedValue('new-user-id');
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({
      body: {
        email: 'new@example.com',
        role: 'buyer',
        profile: { name: 'New User' }
      }
    });
    const res = createResponse();

    await controller.register(req, res);

    expect(registerUserUseCase.execute).toHaveBeenCalledWith({
      email: 'new@example.com',
      role: 'buyer',
      profile: { name: 'New User' }
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, userId: 'new-user-id' });
  });

  it('register maps thrown errors to 400 responses', async () => {
    registerUserUseCase.execute.mockRejectedValue(new Error('invalid profile'));
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({ body: { email: 'bad@example.com' } });
    const res = createResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'invalid profile' });
  });

  it('login sets refresh token cookie and strips refreshToken from response body', async () => {
    authenticateUserUseCase.execute.mockResolvedValue({
      success: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      message: 'Authenticated'
    });
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({
      body: { email: 'user@example.com', password: 'secret', totpCode: '123456' },
      ip: '10.0.0.4',
      get: jest.fn().mockReturnValue('test-agent')
    });
    const res = createResponse();

    await controller.login(req, res);

    expect(authenticateUserUseCase.execute).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
      totpCode: '123456',
      ipAddress: '10.0.0.4',
      userAgent: 'test-agent'
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        maxAge: 604800000
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      accessToken: 'access-token',
      message: 'Authenticated'
    });
  });

  it('login returns unauthorized when authentication fails', async () => {
    authenticateUserUseCase.execute.mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    });
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({ body: { email: 'user@example.com', password: 'wrong' } });
    const res = createResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid credentials'
    });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('login maps thrown errors to 500 responses', async () => {
    authenticateUserUseCase.execute.mockRejectedValue(new Error('identity provider down'));
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({ body: { email: 'user@example.com', password: 'secret' } });
    const res = createResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'identity provider down'
    });
  });

  it('logout clears auth cookies and returns success', async () => {
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest();
    const res = createResponse();

    await controller.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: false
      })
    );
    expect(res.clearCookie).toHaveBeenCalledWith('csrf-token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Logged out' });
  });

  it('returns stubbed responses for refresh/session/password/2fa/stats endpoints', async () => {
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({
      cookies: { refreshToken: 'cookie-token' },
      body: { refreshToken: 'body-token' }
    });
    const res = createResponse();

    await controller.refreshToken(req, res);
    await controller.verifySession(req, res);
    await controller.forgotPassword(req, res);
    await controller.resetPassword(req, res);
    await controller.enableTwoFactor(req, res);
    await controller.disableTwoFactor(req, res);
    await controller.verifyTwoFactorSetup(req, res);
    await controller.reportSuspiciousActivity(req, res);
    await controller.getAuthStats(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not implemented' });
    expect(res.json).toHaveBeenCalledWith({ valid: true });
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(res.json).toHaveBeenCalledWith({ activeUsers: 0 });
  });
});
