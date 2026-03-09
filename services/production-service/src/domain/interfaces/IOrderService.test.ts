import type { IOrderService } from './IOrderService';

describe('IOrderService contract', () => {
  it('supports getOrder and updateOrderStatus operations', async () => {
    const service: IOrderService = {
      getOrder: jest.fn().mockResolvedValue({ id: 'order-1', status: 'PENDING' }),
      updateOrderStatus: jest.fn().mockResolvedValue(undefined)
    };

    const order = await service.getOrder('order-1');
    await service.updateOrderStatus('order-1', 'COMPLETED');

    expect(order.id).toBe('order-1');
    expect(service.updateOrderStatus).toHaveBeenCalledWith('order-1', 'COMPLETED');
  });
});
