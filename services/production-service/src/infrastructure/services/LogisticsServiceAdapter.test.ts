import { LogisticsServiceAdapter } from './LogisticsServiceAdapter';

describe('LogisticsServiceAdapter', () => {
  it('logs fulfillment trigger action', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new LogisticsServiceAdapter();

    await adapter.triggerFulfillment('order-2');

    expect(logSpy).toHaveBeenCalledWith(
      '[LogisticsAdapter] Triggering fulfillment for order order-2'
    );
    logSpy.mockRestore();
  });
});
