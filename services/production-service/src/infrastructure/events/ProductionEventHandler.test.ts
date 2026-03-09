import { ProductionEventHandler } from './ProductionEventHandler';

describe('ProductionEventHandler', () => {
  it('logs production completed internal event payload', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = new ProductionEventHandler();
    const event = { orderId: 'order-3', status: 'COMPLETED' };

    await handler.handleProductionCompleted(event);

    expect(logSpy).toHaveBeenCalledWith(
      '[ProductionEventHandler] Production Completed internal event:',
      event
    );
    logSpy.mockRestore();
  });
});
