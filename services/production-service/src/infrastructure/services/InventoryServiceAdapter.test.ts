import { InventoryServiceAdapter } from './InventoryServiceAdapter';

describe('InventoryServiceAdapter', () => {
  it('checks availability and logs action', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new InventoryServiceAdapter();

    const available = await adapter.checkAvailability('product-1', 5);

    expect(available).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      '[InventoryAdapter] Checking availability for product-1: 5'
    );
    logSpy.mockRestore();
  });

  it('updates stock and logs action', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new InventoryServiceAdapter();

    await adapter.updateStock('product-2', 3, 'OUT');

    expect(logSpy).toHaveBeenCalledWith('[InventoryAdapter] Updating stock for product-2: OUT 3');
    logSpy.mockRestore();
  });
});
