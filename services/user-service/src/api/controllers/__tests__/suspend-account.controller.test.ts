import { SuspendAccountController } from '../suspend-account.controller';
import { Request, Response } from 'express';

describe('SuspendAccountController', () => {
  let controller: SuspendAccountController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new SuspendAccountController(mockUseCase);
    mockReq = { params: { id: 'user-1' }, body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful account suspension', async () => {
    mockReq.body = { suspendedBy: 'admin', reason: 'violation' };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Account suspended' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Account suspended' });
  });

  test('returns 400 when missing id', async () => {
    mockReq.params = {};
    mockReq.body = { suspendedBy: 'admin', reason: 'violation' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing suspendedBy', async () => {
    mockReq.body = { reason: 'violation' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing reason', async () => {
    mockReq.body = { suspendedBy: 'admin' };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { suspendedBy: 'admin', reason: 'violation' };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { suspendedBy: 'admin', reason: 'violation' };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('includes duration when provided', async () => {
    mockReq.body = { suspendedBy: 'admin', reason: 'violation', duration: 86400000 };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Account suspended' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ duration: 86400000 }));
  });
});
