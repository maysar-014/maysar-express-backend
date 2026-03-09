import { OrderEventHandler } from './OrderEventHandler';

describe('OrderEventHandler', () => {
  it('handles confirmed order by delegating to saga', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const saga = { onOrderConfirmed: jest.fn().mockResolvedValue(undefined) };
    const handler = new OrderEventHandler(saga as never);
    const event = { orderId: 'order-1' };

    await handler.handleOrderConfirmed(event);

    expect(logSpy).toHaveBeenCalledWith('[OrderEventHandler] Handling OrderConfirmed:', event);
    expect(saga.onOrderConfirmed).toHaveBeenCalledWith(event);
    logSpy.mockRestore();
  });

  it('handles cancelled order by logging', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const saga = { onOrderConfirmed: jest.fn() };
    const handler = new OrderEventHandler(saga as never);
    const event = { orderId: 'order-2' };

    await handler.handleOrderCancelled(event);

    expect(logSpy).toHaveBeenCalledWith('[OrderEventHandler] Handling OrderCancelled:', event);
    expect(saga.onOrderConfirmed).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
