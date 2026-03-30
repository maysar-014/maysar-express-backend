jest.mock('../../../shared/outbox/outboxPattern', () => ({
  TransactionalOutbox: jest.fn().mockImplementation(() => ({
    saveEvent: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('@shared-events/eventBus', () => ({
  eventBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  }
}), { virtual: true });

import { InventoryService } from './inventoryService';

interface MockPrisma {
  $transaction: jest.Mock;
  inventory_StockItem: {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  inventory_Reservation: {
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
}

const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  inventory_StockItem: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  inventory_Reservation: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  }
} as MockPrisma;

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(mockPrisma as unknown as never);
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        id: 's1',
        quantityAvailable: 100,
        quantityReserved: 0
      });
      mockPrisma.inventory_Reservation.create.mockResolvedValue({
        id: 'r1'
      });

      const result = await service.reserveInventory({
        orderId: 'o1',
        items: [{ productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }]
      });

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(1);
    });

    it('should rollback on insufficient stock', async () => {
      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        id: 's1',
        quantityAvailable: 5,
        quantityReserved: 0
      });

      await expect(service.reserveInventory({
        orderId: 'o1',
        items: [{ productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }]
      })).rejects.toThrow('Insufficient stock');
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory successfully', async () => {
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue([
        { id: 'r1', productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }
      ]);

      await service.releaseInventory('o1', 'order_cancelled');

      expect(mockPrisma.inventory_Reservation.update).toHaveBeenCalled();
      expect(mockPrisma.inventory_StockItem.updateMany).toHaveBeenCalled();
    });
  });
});
