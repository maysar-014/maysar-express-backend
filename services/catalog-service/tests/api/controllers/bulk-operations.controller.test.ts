import { BulkOperationsController } from '../../../src/api/controllers/bulk-operations.controller';
import { Request, Response } from 'express';

describe('BulkOperationsController', () => {
  let controller: BulkOperationsController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new BulkOperationsController();
    req = { params: {}, body: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('bulkCreateProducts', () => {
    it('should handle request successfully', async () => {
      req.body = { products: [{ id: 'p1' }, { id: 'p2' }] };
      await controller.bulkCreateProducts(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            createdCount: 2
          })
        })
      );
    });
  });
});
