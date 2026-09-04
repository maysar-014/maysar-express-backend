import type { Request, Response } from 'express';
import { CheckCODEligibilityUseCase } from '../../application/use-cases/check-cod-eligibility.use-case';
import { PlaceOrderUseCase } from '../../application/use-cases/place-order.use-case';
import { OrderController } from './order.controller';

const mockOrderRepository = {
  findById: jest.fn(),
  findByBuyerId: jest.fn(),
  findBySellerId: jest.fn(),
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

  it('requires an order scope when listing without auth context', async () => {
    const req = {
      query: {},
      headers: { 'x-request-id': 'req-3' }
    } as unknown as Request;
    const res = createResponse();

    await controller.getOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'MISSING_ORDER_SCOPE'
      })
    );
  });

  it('infers buyer-scoped listing from the authenticated buyer', async () => {
    const req = {
      query: {},
      user: { userId: 'buyer-1', roles: ['buyer'] },
      headers: { 'x-request-id': 'req-3b' }
    } as unknown as Request;
    const res = createResponse();
    const orders = [{ id: 'ord-1', buyerId: 'buyer-1', status: 'pending' }];
    mockOrderRepository.findByBuyerId.mockResolvedValue(orders);

    await controller.getOrders(req, res);

    expect(mockOrderRepository.findByBuyerId).toHaveBeenCalledWith('buyer-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orders,
        data: orders,
        scope: { buyerId: 'buyer-1' }
      })
    );
  });

  it('infers seller-scoped listing from the authenticated seller', async () => {
    const req = {
      query: {},
      user: { userId: 'seller-1', roles: ['seller'] },
      headers: { 'x-request-id': 'req-3c' }
    } as unknown as Request;
    const res = createResponse();
    const orders = [{ id: 'ord-2', sellerId: 'seller-1', status: 'confirmed' }];
    mockOrderRepository.findBySellerId.mockResolvedValue(orders);

    await controller.getOrders(req, res);

    expect(mockOrderRepository.findBySellerId).toHaveBeenCalledWith('seller-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orders,
        data: orders,
        scope: { sellerId: 'seller-1' }
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

  it('accepts status aliases from E2E helpers when updating order status', async () => {
    const req = {
      params: { id: 'ord-3a' },
      body: { status: 'confirm' },
      headers: { 'x-request-id': 'req-4a' }
    } as unknown as Request;
    const res = createResponse();
    const order = { id: 'ord-3a', status: 'pending' };
    mockOrderRepository.findById.mockResolvedValue(order);

    await controller.updateOrderStatus(req, res);

    expect(mockOrderRepository.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed', previousStatus: 'pending' }));
  });

  it('ships orders stored as assigned after processing persistence mapping', async () => {
    const req = {
      params: { id: 'ord-3b' },
      body: { status: 'ship' },
      headers: { 'x-request-id': 'req-4b' }
    } as unknown as Request;
    const res = createResponse();
    const order = { id: 'ord-3b', status: 'ASSIGNED' };
    mockOrderRepository.findById.mockResolvedValue(order);

    await controller.updateOrderStatus(req, res);

    expect(mockOrderRepository.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'shipped' }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'shipped', previousStatus: 'ASSIGNED' }));
  });

  it('treats duplicate process requests as idempotent after assigned persistence mapping', async () => {
    const req = {
      params: { id: 'ord-3c' },
      body: { status: 'process' },
      headers: { 'x-request-id': 'req-4c' }
    } as unknown as Request;
    const res = createResponse();
    mockOrderRepository.findById.mockResolvedValue({ id: 'ord-3c', status: 'ASSIGNED' });

    await controller.updateOrderStatus(req, res);

    expect(mockOrderRepository.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ASSIGNED', idempotent: true }));
  });

  it('returns ineligible result when COD check throws', async () => {
    const req = {
      body: { buyerId: 'buyer-1' }
    } as unknown as Request;
    const res = createResponse();
    checkCodUseCase.execute.mockRejectedValue(new Error('engine failed'));

    await controller.validateCODELigibility(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible: false,
        error: 'ELIGIBILITY_CHECK_FAILED'
      })
    );
  });

  it('allows deleting orders with uppercase pending status', async () => {
    const req = {
      params: { id: 'ord-pending' },
      query: {},
      user: { userId: 'buyer-1', roles: ['buyer'] },
      headers: { 'x-request-id': 'req-5' }
    } as unknown as Request;
    const res = createResponse();

    mockOrderRepository.findById.mockResolvedValue({ id: 'ord-pending', status: 'PENDING', buyerId: 'buyer-1' });

    await controller.deleteOrder(req, res);

    expect(mockOrderRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ord-pending', status: 'cancelled' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects explicit cancel action for confirmed buyer order until seller consents', async () => {
    const req = {
      params: { id: 'ord-confirmed' },
      body: { reason: 'Need to change address' },
      user: { userId: 'buyer-1', roles: ['buyer'] },
      headers: { 'x-request-id': 'req-6' }
    } as unknown as Request;
    const res = createResponse();

    mockOrderRepository.findById.mockResolvedValue({
      id: 'ord-confirmed',
      status: 'CONFIRMED',
      buyerId: 'buyer-1',
      sellerId: 'seller-1'
    });

    await controller.cancelOrder(req, res);

    expect(mockOrderRepository.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'ORDER_CANNOT_BE_CANCELLED',
        message: 'Seller consent is required after the order is confirmed'
      })
    );
  });

  it('allows explicit cancel action for confirmed seller-issued cancellation', async () => {
    const req = {
      params: { id: 'ord-confirmed' },
      body: { reason: 'Seller approved cancellation' },
      user: { userId: 'seller-1', roles: ['seller'] },
      headers: { 'x-request-id': 'req-7' }
    } as unknown as Request;
    const res = createResponse();

    mockOrderRepository.findById.mockResolvedValue({
      id: 'ord-confirmed',
      status: 'CONFIRMED',
      buyerId: 'buyer-1',
      sellerId: 'seller-1'
    });

    await controller.cancelOrder(req, res);

    expect(mockOrderRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ord-confirmed',
        status: 'cancelled',
        cancelReason: 'Seller approved cancellation'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
