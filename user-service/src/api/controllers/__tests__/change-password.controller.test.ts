import { ChangePasswordController } from '../change-password.controller';
import { Request, Response } from 'express';

describe('ChangePasswordController', () => {
  let controller: ChangePasswordController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new ChangePasswordController(mockUseCase);
    mockReq = { params: { id: 'user-1' }, body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful password change', async () => {
    mockReq.body = { newPassword: 'newpass123', changedBy: 'admin' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Password changed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Password changed' });
  });

  test('returns 400 when missing id', async () => {
    mockReq.params = {};
    mockReq.body = { newPassword: 'newpass123', changedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing newPassword', async () => {
    mockReq.body = { changedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing changedBy', async () => {
    mockReq.body = { newPassword: 'newpass123' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { newPassword: 'newpass123', changedBy: 'admin' };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { newPassword: 'newpass123', changedBy: 'admin' };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
