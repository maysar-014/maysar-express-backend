import type { IInventoryService as ApplicationInventoryService } from '../../application/interfaces/IInventoryService';
import type { IInventoryService as DomainInventoryService } from './IInventoryService';

describe('IInventoryService contract', () => {
  it('allows domain implementation to satisfy application-level dependency', async () => {
    const updateStockMock = jest.fn().mockResolvedValue(undefined);
    const domainService: DomainInventoryService = {
      checkAvailability: async () => true,
      updateStock: updateStockMock
    };

    const applicationService: ApplicationInventoryService = {
      updateStock: async (id: string, qty: number) => domainService.updateStock(id, qty, 'OUT')
    };
    await applicationService.updateStock('product-1', 4);

    expect(applicationService.updateStock).toBeDefined();
    expect(updateStockMock).toHaveBeenCalledWith('product-1', 4, 'OUT');
  });

  it('loads both inventory interface modules successfully', async () => {
    const domainModule = await import('./IInventoryService');
    const applicationModule = await import('../../application/interfaces/IInventoryService');

    expect(domainModule).toBeDefined();
    expect(applicationModule).toBeDefined();
  });
});
