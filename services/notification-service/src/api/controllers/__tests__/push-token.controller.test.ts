import { PushTokenController } from '../push-token.controller';
import { Request, Response, NextFunction } from 'express';
import { IPushTokenRepository } from '../../../domain/repositories';

const mockRepo: IPushTokenRepository = {
  upsertToken: jest.fn(),
  listActiveTokensByUserId: jest.fn(),
  deactivateToken: jest.fn()
};

describe('PushTokenController', () => {
  let controller: PushTokenController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PushTokenController(mockRepo);
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('register', () => {
    it('returns 401 when userId missing', async () => {
      req.body = { token: 'tok-1' };
      await controller.register(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when token missing', async () => {
      (req as any).userId = 'user-1';
      await controller.register(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when userId mismatch', async () => {
      (req as any).userId = 'user-1';
      req.body = { token: 'tok-1', userId: 'user-2' };
      await controller.register(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('registers token', async () => {
      (req as any).userId = 'user-1';
      req.body = { token: 'tok-1', platform: 'web', deviceId: 'dev-1' };
      (mockRepo.upsertToken as jest.Mock).mockResolvedValue({
        id: 'id-1',
        userId: 'user-1',
        token: 'tok-1',
        platform: 'web',
        deviceId: 'dev-1',
        isActive: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await controller.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockRepo.upsertToken).toHaveBeenCalledWith({
        userId: 'user-1',
        token: 'tok-1',
        platform: 'web',
        deviceId: 'dev-1'
      });
    });
  });

  describe('unregister', () => {
    it('returns 401 when userId missing', async () => {
      req.params = { token: 'tok-1' };
      await controller.unregister(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 when token not found', async () => {
      (req as any).userId = 'user-1';
      req.params = { token: 'tok-1' };
      (mockRepo.deactivateToken as jest.Mock).mockResolvedValue(false);
      await controller.unregister(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deactivates token', async () => {
      (req as any).userId = 'user-1';
      req.params = { token: 'tok-1' };
      (mockRepo.deactivateToken as jest.Mock).mockResolvedValue(true);
      await controller.unregister(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
