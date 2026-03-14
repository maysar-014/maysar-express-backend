import type { Request, Response } from 'express';
import { CheckCODEligibilityUseCase } from '../../application/use-cases/check-cod-eligibility.use-case';
import { PlaceOrderUseCase } from '../../application/use-cases/place-order.use-case';
import { OrderController } from './order.controller';

const mockOrderRepository = {
  findById: jest.fn(),
  findByBuyerId: jest.fn(),
  findByStatus: jest.fn(),
  update: jest.fn(),
  count: jest.fn()
};

jest.mock('../../infrastructure/database/prisma-order.repository', () => ({
  PrismaOrderRepository: jest.fn().mockImplementation(() => mockOrderRepository)
}));

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('OrderController', () => {
  let controller: OrderController;
  let placeOrderUseCase: { execute: jest.Mock };
  let checkCodUseCase: { execute: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    placeOrderUseCase = { execute: jest.fn() };
    checkCodUseCase = { execute: jest.fn() };
    controller = new OrderController(
      placeOrderUseCase as unknown as PlaceOrderUseCase,
      checkCodUseCase as unknown as CheckCODEligibilityUseCase
    );
  });

  it('places order and returns transformed payload', async () => {
    const req = {
      body: {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        items: [
          { productId: 'p1', quantity: 2, price: 100, weight: 1 },
          { productId: 'p2', quantity: 1, price: { amount: 50, currency: 'TZS' }, weight: 1 }
        ],
        deliveryAddress: { street: 'A' },
        paymentMethod: 'cod',
        currency: 'TZS'
      },
      headers: { 'x-request-id': 'req-1' }
    } as unknown as Request;
    const res = createResponse();

    placeOrderUseCase.execute.mockResolvedValue({ orderId: 'ord-1', status: 'pending' });

    await controller.placeOrder(req, res);

    expect(placeOrderUseCase.execute).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ord-1',
        totalAmount: { amount: 250, currency: 'TZS' }
      })
    );
  });

  it('returns 404 when order is missing', async () => {
    const req = {
      params: { id: 'missing' },
      headers: { 'x-request-id': 'req-2' }
    } as unknown as Request;
    const res = createResponse();

    mockOrderRepository.findById.mockResolvedValue(null);

    await controller.getOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'ORDER_NOT_FOUND'
      })
    );
  });

  it('requires buyerId for listing orders', async () => {
    const req = {
      query: {},
      headers: { 'x-request-id': 'req-3' }
    } as unknown as Request;
    const res = createResponse();

    await controller.getOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'MISSING_BUYER_ID'
      })
    );
  });

  it('rejects invalid status transition action', async () => {
    const req = {
      params: { id: 'ord-3' },
      body: { action: 'invalid' },
      headers: { 'x-request-id': 'req-4' }
    } as unknown as Request;
    const res = createResponse();

    mockOrderRepository.findById.mockResolvedValue({ id: 'ord-3', status: 'pending' });

    await controller.updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'INVALID_ACTION'
      })
    );
  });

  it('returns ineligible result when COD check throws', async () => {
    const req = {
      body: { buyerId: 'buyer-1' }
    } as unknown as Request;
    const res = createResponse();
    checkCodUseCase.execute.mockRejectedValue(new Error('engine failed'));

    await controller.validateCODELigibility(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: false,
        error: 'ELIGIBILITY_CHECK_FAILED'
      })
    );
  });
});
