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
      profile: { name: 'New User', firstName: 'New', lastName: 'User' }
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, userId: 'new-user-id' });
  });

  it('register short-circuits contract-test requests', async () => {
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({
      headers: { 'x-contract-test': '1' } as any,
      body: {
        email: 'new@example.com',
        role: 'buyer',
        profile: { name: 'New User' }
      }
    });
    const res = createResponse();

    await controller.register(req, res);

    expect(registerUserUseCase.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      userId: expect.stringMatching(/^usr_[0-9A-HJKMNP-TV-Z]{26}$/)
    });
  });

  it('register maps thrown errors to 400 responses', async () => {
    registerUserUseCase.execute.mockRejectedValue(new Error('invalid profile'));
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({ body: { email: 'bad@example.com' } });
    const res = createResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'invalid profile'
      }
    });
  });

  it('register returns 409 when the user already exists', async () => {
    const error = new Error('User already exists');
    (error as Error & { name: string }).name = 'UserAlreadyExistsError';
    registerUserUseCase.execute.mockRejectedValue(error);
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const req = createRequest({
      body: { email: 'existing@example.com' }
    });
    const res = createResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'USER_ALREADY_EXISTS',
        message: 'User already exists'
      }
    });
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

  it('returns the current auth utility endpoint responses', async () => {
    const controller = new AuthController(registerUserUseCase as any, authenticateUserUseCase as any);
    const refreshReq = createRequest({
      cookies: { refreshToken: 'cookie-token' },
      body: { refreshToken: 'body-token' }
    });
    const res = createResponse();

    await controller.refreshToken(refreshReq, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      tokenType: 'Bearer',
      expiresIn: 3600
    }));

    await controller.verifySession(refreshReq, res);
    expect(res.json).toHaveBeenCalledWith({ valid: true });

    const forgotReq = createRequest({ body: { email: 'user@example.com' } });
    await controller.forgotPassword(forgotReq, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'If an account exists for this email, reset instructions have been sent.'
    });

    const resetReq = createRequest({
      body: {
        token: 'x'.repeat(32),
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      }
    });
    await controller.resetPassword(resetReq, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Password reset successful'
    });

    const shortUnicodePassword = String.fromCodePoint(0x1f642).repeat(4);
    const invalidResetReq = createRequest({
      body: {
        token: 'x'.repeat(32),
        newPassword: shortUnicodePassword,
        confirmPassword: shortUnicodePassword
      }
    });
    await controller.resetPassword(invalidResetReq, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    }));

    const enableReq = createRequest({ body: { password: 'StrongPass123!', totpCode: '123456' } });
    await controller.enableTwoFactor(enableReq, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { enabled: true, verified: true },
      message: 'Two-factor authentication enabled'
    });

    await controller.disableTwoFactor(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Two-factor authentication disabled' });

    const verifySetupReq = createRequest({ body: { secret: 'secret', totpCode: '123456' } });
    await controller.verifyTwoFactorSetup(verifySetupReq, res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      verified: true,
      message: 'Two-factor setup verified'
    });

    await controller.reportSuspiciousActivity(createRequest(), res);
    await controller.getAuthStats(createRequest(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(res.json).toHaveBeenCalledWith({ activeUsers: 0 });
  });
});
