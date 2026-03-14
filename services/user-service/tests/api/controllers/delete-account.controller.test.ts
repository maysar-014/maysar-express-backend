import { Request, Response } from 'express';
import { DeleteAccountController } from '../../../src/api/controllers/delete-account.controller';

describe('DeleteAccountController', () => {
  let controller: DeleteAccountController;
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new DeleteAccountController(mockUseCase);
    req = { params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('returns 400 when required fields are missing', async () => {
    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when use case succeeds', async () => {
    req.params = { id: 'user-1' };
    req.body = { deletedBy: 'admin-1', reason: 'test' };
    mockUseCase.execute.mockResolvedValue({ success: true });

    await controller.handle(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
