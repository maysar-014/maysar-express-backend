import { DeleteAccountController } from '../delete-account.controller';
import { Request, Response } from 'express';

describe('DeleteAccountController', () => {
  let controller: DeleteAccountController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new DeleteAccountController(mockUseCase);
    mockReq = { params: { id: 'user-1' }, body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful account deletion', async () => {
    mockReq.body = { deletedBy: 'admin', reason: 'user request' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Account deleted' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Account deleted' });
  });

  test('returns 400 when missing id', async () => {
    mockReq.params = {};
    mockReq.body = { deletedBy: 'admin', reason: 'user request' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing deletedBy', async () => {
    mockReq.body = { reason: 'user request' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing reason', async () => {
    mockReq.body = { deletedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { deletedBy: 'admin', reason: 'user request' };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { deletedBy: 'admin', reason: 'user request' };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
