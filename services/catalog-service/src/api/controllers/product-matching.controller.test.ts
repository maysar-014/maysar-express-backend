import { Request, Response } from 'express';
import { ProductMatchingController } from './product-matching.controller';

describe('ProductMatchingController', () => {
  const makeResponse = (): Response =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response);

  it('matches product and prefers authenticated seller id', async () => {
    const matchProductUseCase = {
      execute: jest.fn().mockResolvedValue({ confidence: 0.9 })
    };
    const controller = new ProductMatchingController(
      matchProductUseCase as never,
      {} as never,
      {} as never
    );
    const req = {
      body: {
        brand: 'Samsung',
        model: 'A1',
        categoryId: 'c1',
        identifiers: { sku: 'sku-1' },
        attributes: { color: 'black' },
        sellerId: 'seller-from-body'
      },
      user: { id: 'seller-from-auth' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.matchProduct(req, res);

    expect(matchProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-from-auth'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 when matchProduct throws', async () => {
    const controller = new ProductMatchingController(
      { execute: jest.fn().mockRejectedValue(new Error('match failed')) } as never,
      {} as never,
      {} as never
    );
    const req = {
      body: {},
      headers: { 'x-user-id': 'seller-1' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.matchProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      matchFound: false,
      confidence: 0,
      candidates: [],
      reason: 'match failed'
    });
  });

  it('confirms match by id with selected payload', async () => {
    const confirmMatchUseCase = {
      execute: jest.fn().mockResolvedValue({ decision: 'CONFIRMED' })
    };
    const controller = new ProductMatchingController(
      {} as never,
      confirmMatchUseCase as never,
      {} as never
    );
    const req = {
      params: { confirmationId: 'confirm-1' },
      body: { choice: 'existing', selectedProductId: 'p1' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.confirmMatch(req, res);

    expect(confirmMatchUseCase.execute).toHaveBeenCalledWith('confirm-1', {
      choice: 'existing',
      selectedProductId: 'p1'
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns unauthorized for pending confirmations when user missing', async () => {
    const controller = new ProductMatchingController({} as never, {} as never, {} as never);
    const req = {} as Request;
    const res = makeResponse();

    await controller.getPendingConfirmations(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns empty pending confirmations for authenticated seller', async () => {
    const controller = new ProductMatchingController({} as never, {} as never, {} as never);
    const req = { user: { id: 'seller-1' } } as unknown as Request;
    const res = makeResponse();

    await controller.getPendingConfirmations(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ confirmations: [] });
  });

  it('returns unauthorized for match audit when user missing', async () => {
    const controller = new ProductMatchingController({} as never, {} as never, {} as never);
    const req = { params: { productId: 'p1' } } as unknown as Request;
    const res = makeResponse();

    await controller.getMatchAudit(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns seller audits from repository', async () => {
    const auditRepository = {
      findBySeller: jest.fn().mockResolvedValue([{ id: 'a1' }])
    };
    const controller = new ProductMatchingController({} as never, {} as never, auditRepository as never);
    const req = {
      params: { productId: 'p1' },
      user: { id: 'seller-7' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.getMatchAudit(req, res);

    expect(auditRepository.findBySeller).toHaveBeenCalledWith('seller-7', 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ audits: [{ id: 'a1' }] });
  });

  it('returns 500 when getMatchAudit fails', async () => {
    const auditRepository = {
      findBySeller: jest.fn().mockRejectedValue(new Error('audit failure'))
    };
    const controller = new ProductMatchingController({} as never, {} as never, auditRepository as never);
    const req = {
      params: { productId: 'p1' },
      user: { id: 'seller-7' }
    } as unknown as Request;
    const res = makeResponse();

    await controller.getMatchAudit(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'audit failure' });
  });
});

