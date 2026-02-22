import { BulkOperationsController } from '../src/api/controllers/bulk-operations.controller';
import { Request, Response } from 'express';

describe('BulkOperationsController', () => {
  let controller: BulkOperationsController;
  let mockUseCase: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new BulkOperationsController(mockUseCase);
    req = { params: {}, body: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('bulkCreateProducts', () => {
    it('should handle request successfully', async () => {
      mockUseCase.execute.mockResolvedValue({ success: true });
      await controller.bulkCreateProducts(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Test error'));
      await controller.bulkCreateProducts(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
