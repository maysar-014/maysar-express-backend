import { OrderService } from './order.service';

describe('OrderService', () => {
  it('creates an order with pending status and timestamp', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'order-1' });
    const service = new OrderService({ order: { create } });

    const result = await service.createOrder('checkout-1', 'user-1', 2500);

    expect(result).toEqual({ id: 'order-1' });
    expect(create).toHaveBeenCalledWith({
      data: {
        checkoutSessionId: 'checkout-1',
        userId: 'user-1',
        totalAmount: 2500,
        status: 'pending',
        createdAt: expect.any(Date)
      }
    });
  });

  it('fetches an order including items', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'order-1', items: [] });
    const service = new OrderService({ order: { findUnique } });

    await service.getOrder('order-1');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      include: { items: true }
    });
  });

  it('updates order status with updatedAt timestamp', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const service = new OrderService({ order: { update } });

    await service.updateOrderStatus('order-1', 'confirmed');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'confirmed',
        updatedAt: expect.any(Date)
      }
    });
  });
});
