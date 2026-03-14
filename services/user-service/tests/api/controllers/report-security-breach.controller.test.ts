import { Request, Response } from 'express';
import { ReportSecurityBreachController } from '../../../src/api/controllers/report-security-breach.controller';

describe('ReportSecurityBreachController', () => {
  let controller: ReportSecurityBreachController;
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new ReportSecurityBreachController(mockUseCase);
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('returns 400 when required fields are missing', async () => {
    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when use case succeeds', async () => {
    req.body = { userId: 'user-1', breachType: 'suspicious_login', severity: 'high' };
    mockUseCase.execute.mockResolvedValue({ success: true });

    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
