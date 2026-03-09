import { InventoryEventHandler } from './InventoryEventHandler';

describe('InventoryEventHandler', () => {
  it('logs inventory reserved event payload', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = new InventoryEventHandler();
    const event = { orderId: 'order-1', sku: 'sku-1' };

    await handler.handleInventoryReserved(event);

    expect(logSpy).toHaveBeenCalledWith('[InventoryEventHandler] Inventory Reserved:', event);
    logSpy.mockRestore();
  });
});
