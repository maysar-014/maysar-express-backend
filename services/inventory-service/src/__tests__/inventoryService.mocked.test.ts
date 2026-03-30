import { InventoryService } from '../inventoryService';
import { eventBus } from '@shared-events/eventBus';

jest.mock('@shared-events/eventBus');
jest.mock('../../../../shared/outbox/outboxPattern');

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

describe('InventoryService Integration', () => {
  let service: InventoryService;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = {
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
    };

    service = new InventoryService(mockPrisma as unknown as never);
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 5, warehouseId: 'wh-1' }
        ]
      };

      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        id: 'inv-1',
        productVariantId: 'var-1',
        warehouseId: 'wh-1',
        quantityAvailable: 100,
        quantityReserved: 0
      } as any);

      mockPrisma.inventory_Reservation.create.mockResolvedValue({
        id: 'res-1'
      } as any);

      const result = await service.reserveInventory(reservationData);

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(1);
      expect(mockPrisma.inventory_StockItem.update).toHaveBeenCalled();
    });

    it('should throw error when insufficient stock', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 50, warehouseId: 'wh-1' }
        ]
      };

      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        id: 'inv-1',
        quantityAvailable: 10,
        quantityReserved: 0
      } as any);

      await expect(service.reserveInventory(reservationData)).rejects.toThrow('Insufficient stock');
    });

    it('should handle multiple items', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 5, warehouseId: 'wh-1' },
          { productVariantId: 'var-2', quantity: 3, warehouseId: 'wh-1' }
        ]
      };

      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        id: 'inv-1',
        quantityAvailable: 100,
        quantityReserved: 0
      } as any);

      const result = await service.reserveInventory(reservationData);

      expect(result.reservationIds).toHaveLength(2);
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory successfully', async () => {
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          orderId: 'order-1',
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 5,
          status: 'active'
        }
      ] as any);

      await service.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.inventory_Reservation.update).toHaveBeenCalled();
      expect(mockPrisma.inventory_StockItem.updateMany).toHaveBeenCalled();
    });

    it('should handle multiple reservations', async () => {
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue([
        { id: 'res-1', orderId: 'order-1', productVariantId: 'var-1', warehouseId: 'wh-1', quantity: 5, status: 'active' },
        { id: 'res-2', orderId: 'order-1', productVariantId: 'var-2', warehouseId: 'wh-1', quantity: 3, status: 'active' }
      ] as any);

      await service.releaseInventory('order-1', 'payment_failed');

      expect(mockPrisma.inventory_Reservation.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory_StockItem.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should handle no active reservations', async () => {
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue([]);

      await expect(service.releaseInventory('order-999', 'expired')).resolves.not.toThrow();
    });
  });
});
