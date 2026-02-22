import { InventoryService } from '../inventoryService';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
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
} as unknown as PrismaClient;

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(mockPrisma);
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      (mockPrisma.inventory.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
        availableQuantity: 100,
        reservedQuantity: 0
      });
      (mockPrisma.inventoryReservation.create as jest.Mock).mockResolvedValue({
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
      (mockPrisma.inventory.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
        availableQuantity: 5,
        reservedQuantity: 0
      });

      await expect(service.reserveInventory({
        orderId: 'o1',
        items: [{ productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }]
      })).rejects.toThrow('Insufficient stock');
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory successfully', async () => {
      (mockPrisma.inventoryReservation.findMany as jest.Mock).mockResolvedValue([
        { id: 'r1', productVariantId: 'pv1', quantity: 10, warehouseId: 'w1' }
      ]);

      await service.releaseInventory('o1', 'order_cancelled');

      expect(mockPrisma.inventoryReservation.update).toHaveBeenCalled();
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalled();
    });
  });
});
