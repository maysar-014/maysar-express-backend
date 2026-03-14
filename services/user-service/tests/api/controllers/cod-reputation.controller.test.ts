import { Request, Response } from 'express';
import { CODReputationController } from '../../../src/api/controllers/cod-reputation.controller';

describe('CODReputationController', () => {
  let controller: CODReputationController;
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new CODReputationController(mockUseCase);
    req = { params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('returns 200 when reputation is found', async () => {
    req.params = { userId: 'user-1' };
    mockUseCase.execute.mockResolvedValue({ userId: 'user-1', codEnabled: true });

    await controller.getReputation(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when use case throws', async () => {
    req.params = { userId: 'user-1' };
    mockUseCase.execute.mockRejectedValue(new Error('not found'));

    await controller.getReputation(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
