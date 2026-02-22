import { InventoryService } from '../inventoryService';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

jest.mock('@prisma/client');
jest.mock('../../../shared/events/eventBus');
jest.mock('../../../shared/outbox/outboxPattern');

describe('InventoryService Integration', () => {
  let service: InventoryService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      inventory: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      inventoryReservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    } as any;

    service = new InventoryService(mockPrisma);
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 5, warehouseId: 'wh-1' }
        ]
      };

      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        productVariantId: 'var-1',
        warehouseId: 'wh-1',
        availableQuantity: 100,
        reservedQuantity: 0
      } as any);

      mockPrisma.inventoryReservation.create.mockResolvedValue({
        id: 'res-1'
      } as any);

      const result = await service.reserveInventory(reservationData);

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(1);
      expect(mockPrisma.inventory.update).toHaveBeenCalled();
    });

    it('should throw error when insufficient stock', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 50, warehouseId: 'wh-1' }
        ]
      };

      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        availableQuantity: 10
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

      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        availableQuantity: 100
      } as any);

      const result = await service.reserveInventory(reservationData);

      expect(result.reservationIds).toHaveLength(2);
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory successfully', async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
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

      expect(mockPrisma.inventoryReservation.update).toHaveBeenCalled();
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalled();
    });

    it('should handle multiple reservations', async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
        { id: 'res-1', orderId: 'order-1', productVariantId: 'var-1', warehouseId: 'wh-1', quantity: 5, status: 'active' },
        { id: 'res-2', orderId: 'order-1', productVariantId: 'var-2', warehouseId: 'wh-1', quantity: 3, status: 'active' }
      ] as any);

      await service.releaseInventory('order-1', 'payment_failed');

      expect(mockPrisma.inventoryReservation.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should handle no active reservations', async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([]);

      await expect(service.releaseInventory('order-999', 'expired')).resolves.not.toThrow();
    });
  });
});
