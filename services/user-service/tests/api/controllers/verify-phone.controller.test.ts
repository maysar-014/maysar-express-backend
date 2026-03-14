import { Request, Response } from 'express';
import { VerifyPhoneController } from '../../../src/api/controllers/verify-phone.controller';

describe('VerifyPhoneController', () => {
  let controller: VerifyPhoneController;
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new VerifyPhoneController(mockUseCase);
    req = { params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('returns 400 when required fields are missing', async () => {
    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when use case succeeds', async () => {
    req.params = { id: 'user-1' };
    req.body = { phoneNumber: '+255712345678', otp: '123456' };
    mockUseCase.execute.mockResolvedValue({ success: true });

    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
