import { SetupTwoFactorController } from '../setup-two-factor.controller';
import { Request, Response } from 'express';

describe('SetupTwoFactorController', () => {
  let controller: SetupTwoFactorController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new SetupTwoFactorController(mockUseCase);
    mockReq = { params: { id: 'user-1' }, body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful 2FA setup', async () => {
    mockReq.body = { method: 'totp' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: '2FA setup initiated' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: '2FA setup initiated' });
  });

  test('returns 400 when missing id', async () => {
    mockReq.params = {};
    mockReq.body = { method: 'totp' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing method', async () => {
    mockReq.body = {};
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { method: 'totp' };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { method: 'totp' };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('includes deviceId when provided', async () => {
    mockReq.body = { method: 'totp', deviceId: 'device-123' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: '2FA setup initiated' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 'device-123' }));
  });
});
