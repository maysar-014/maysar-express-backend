import { ChangeRoleController } from '../change-role.controller';
import { Request, Response } from 'express';

describe('ChangeRoleController', () => {
  let controller: ChangeRoleController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new ChangeRoleController(mockUseCase);
    mockReq = { params: { id: 'user-1' }, body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful role change', async () => {
    mockReq.body = { newRole: 'seller', changedBy: 'admin' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Role changed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Role changed' });
  });

  test('returns 400 when missing id', async () => {
    mockReq.params = {};
    mockReq.body = { newRole: 'seller', changedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing newRole', async () => {
    mockReq.body = { changedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing changedBy', async () => {
    mockReq.body = { newRole: 'seller' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { newRole: 'seller', changedBy: 'admin' };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { newRole: 'seller', changedBy: 'admin' };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
