import { ReportSecurityBreachController } from '../report-security-breach.controller';
import { Request, Response } from 'express';

describe('ReportSecurityBreachController', () => {
  let controller: ReportSecurityBreachController;
  let mockUseCase: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new ReportSecurityBreachController(mockUseCase);
    mockReq = { body: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  test('handles successful breach report', async () => {
    mockReq.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high', details: {} };
    mockUseCase.execute.mockResolvedValue({ success: true, message: 'Breach reported' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Breach reported' });
  });

  test('returns 400 when missing userId', async () => {
    mockReq.body = { breachType: 'suspicious_login', severity: 'high', details: {} };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing breachType', async () => {
    mockReq.body = { userId: 'user-1', severity: 'high', details: {} };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when missing severity', async () => {
    mockReq.body = { userId: 'user-1', breachType: 'suspicious_login', details: {} };
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 on use case failure', async () => {
    mockReq.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high', details: {} };
    mockUseCase.execute.mockResolvedValue({ success: false, message: 'Failed' });
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('returns 500 on exception', async () => {
    mockReq.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high', details: {} };
    mockUseCase.execute.mockRejectedValue(new Error('DB error'));
    
    await controller.handle(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
