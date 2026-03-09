import { OrderServiceAdapter } from './OrderServiceAdapter';

describe('OrderServiceAdapter', () => {
  it('returns order payload and logs read operations', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new OrderServiceAdapter();

    const order = await adapter.getOrder('order-20');
    const details = await adapter.getOrderDetails('order-20');

    expect(order).toEqual({ id: 'order-20', products: [] });
    expect(details).toEqual({ id: 'order-20', products: [] });
    expect(logSpy).toHaveBeenCalledWith('[OrderAdapter] Getting order order-20');
    expect(logSpy).toHaveBeenCalledWith('[OrderAdapter] Getting details for order order-20');
    logSpy.mockRestore();
  });

  it('updates order status and logs operation', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new OrderServiceAdapter();

    await adapter.updateOrderStatus('order-21', 'COMPLETED');

    expect(logSpy).toHaveBeenCalledWith(
      '[OrderAdapter] Updating order order-21 to status COMPLETED'
    );
    logSpy.mockRestore();
  });
});
