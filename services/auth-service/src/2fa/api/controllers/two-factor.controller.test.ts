import type { Request, Response } from 'express';
import { TwoFactorController } from './two-factor.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

const setupUseCase = { execute: jest.fn() };
const verifySetupUseCase = { execute: jest.fn() };
const verifyLoginUseCase = { execute: jest.fn() };
const verifyBackupUseCase = { execute: jest.fn() };
const disableUseCase = { execute: jest.fn() };
const regenerateUseCase = { execute: jest.fn() };
const statusUseCase = { execute: jest.fn() };

const createController = () =>
  new TwoFactorController(
    setupUseCase as never,
    verifySetupUseCase as never,
    verifyLoginUseCase as never,
    verifyBackupUseCase as never,
    disableUseCase as never,
    regenerateUseCase as never,
    statusUseCase as never
  );

describe('TwoFactorController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setup returns 401 when user context is missing', async () => {
    const controller = createController();
    const req = { body: { method: 'totp' } } as unknown as Request;
    const res = createResponse();

    await controller.setup(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
  });

  it('setup executes use-case and returns response data', async () => {
    const controller = createController();
    const req = {
      user: { userId: 'u1', email: 'u1@test.com' },
      body: { method: 'totp', deviceName: 'phone' }
    } as unknown as Request;
    const res = createResponse();
    setupUseCase.execute.mockResolvedValue({ qrCodeDataUrl: 'data:image/png;base64,abc' });

    await controller.setup(req, res);

    expect(setupUseCase.execute).toHaveBeenCalledWith('u1', 'u1@test.com', { method: 'totp', deviceName: 'phone' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { qrCodeDataUrl: 'data:image/png;base64,abc' }
    });
  });

  it('setup returns 400 on use-case error', async () => {
    const controller = createController();
    const req = {
      body: { userId: 'u1', email: 'u1@test.com', method: 'totp' }
    } as unknown as Request;
    const res = createResponse();
    setupUseCase.execute.mockRejectedValue(new Error('setup failed'));

    await controller.setup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'setup failed' });
  });

  it('verifySetup requires authentication and returns use-case payload on success', async () => {
    const controller = createController();
    const unauthReq = { body: { code: '123456' } } as unknown as Request;
    const res = createResponse();

    await controller.verifySetup(unauthReq, res);
    expect(res.status).toHaveBeenCalledWith(401);

    const authReq = { user: { userId: 'u2' }, body: { code: '123456' } } as unknown as Request;
    verifySetupUseCase.execute.mockResolvedValue({ success: true, backupCodes: ['a', 'b'] });
    await controller.verifySetup(authReq, res);

    expect(verifySetupUseCase.execute).toHaveBeenCalledWith('u2', '123456');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, backupCodes: ['a', 'b'] });
  });

  it('verifyLogin validates input and returns success boolean', async () => {
    const controller = createController();
    const invalidReq = { body: { userId: 'u3' } } as unknown as Request;
    const res = createResponse();
    await controller.verifyLogin(invalidReq, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const validReq = { body: { userId: 'u3', code: '654321' } } as unknown as Request;
    verifyLoginUseCase.execute.mockResolvedValue(true);
    await controller.verifyLogin(validReq, res);

    expect(verifyLoginUseCase.execute).toHaveBeenCalledWith('u3', '654321');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('verifyBackupCode validates input and returns success boolean', async () => {
    const controller = createController();
    const invalidReq = { body: { code: 'hash' } } as unknown as Request;
    const res = createResponse();
    await controller.verifyBackupCode(invalidReq, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const validReq = { body: { userId: 'u4', code: 'hash' } } as unknown as Request;
    verifyBackupUseCase.execute.mockResolvedValue(false);
    await controller.verifyBackupCode(validReq, res);

    expect(verifyBackupUseCase.execute).toHaveBeenCalledWith('u4', 'hash');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: false });
  });

  it('disable requires authentication and handles use-case result', async () => {
    const controller = createController();
    const unauthReq = { body: { code: '123456' } } as unknown as Request;
    const res = createResponse();
    await controller.disable(unauthReq, res);
    expect(res.status).toHaveBeenCalledWith(401);

    const authReq = { user: { userId: 'u5' }, body: { code: '123456' } } as unknown as Request;
    disableUseCase.execute.mockResolvedValue(true);
    await controller.disable(authReq, res);
    expect(disableUseCase.execute).toHaveBeenCalledWith('u5', '123456');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('regenerateBackupCodes and getStatus require auth and return data when authorized', async () => {
    const controller = createController();
    const res = createResponse();

    await controller.regenerateBackupCodes({ body: {} } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);

    regenerateUseCase.execute.mockResolvedValue(['code-a', 'code-b']);
    await controller.regenerateBackupCodes({ user: { userId: 'u6' }, body: {} } as unknown as Request, res);
    expect(regenerateUseCase.execute).toHaveBeenCalledWith('u6');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, backupCodes: ['code-a', 'code-b'] });

    await controller.getStatus({ body: {} } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);

    statusUseCase.execute.mockResolvedValue({ enabled: true, verified: true });
    await controller.getStatus({ user: { userId: 'u6' }, body: {} } as unknown as Request, res);
    expect(statusUseCase.execute).toHaveBeenCalledWith('u6');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { enabled: true, verified: true } });
  });
});
