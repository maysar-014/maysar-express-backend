import { InventoryRepository } from '../inventory.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  inventory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  inventoryReservation: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
} as unknown as PrismaClient;

describe('InventoryRepository', () => {
  let repository: InventoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new InventoryRepository(mockPrisma);
  });

  describe('findStock', () => {
    it('should find stock by product and warehouse', async () => {
      (mockPrisma.inventory.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
        productVariantId: 'pv1',
        warehouseId: 'w1',
        quantity: 100
      });

      const stock = await repository.findStock('pv1', 'w1');

      expect(stock).toBeDefined();
      expect(stock?.id).toBe('s1');
      expect(mockPrisma.inventory.findFirst).toHaveBeenCalledWith({
        where: { productVariantId: 'pv1', warehouseId: 'w1' }
      });
    });

    it('should return null for non-existent stock', async () => {
      (mockPrisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);

      const stock = await repository.findStock('pv1', 'w1');

      expect(stock).toBeNull();
    });
  });

  describe('createReservation', () => {
    it('should create reservation', async () => {
      (mockPrisma.inventoryReservation.create as jest.Mock).mockResolvedValue({
        id: 'r1',
        orderId: 'o1',
        quantity: 10
      });

      const reservation = await repository.createReservation({
        orderId: 'o1',
        productVariantId: 'pv1',
        quantity: 10,
        warehouseId: 'w1'
      });

      expect(reservation.id).toBe('r1');
      expect(mockPrisma.inventoryReservation.create).toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should update stock quantities', async () => {
      (mockPrisma.inventory.update as jest.Mock).mockResolvedValue({
        id: 's1',
        availableQuantity: 90,
        reservedQuantity: 10
      });

      await repository.updateStock('s1', {
        availableQuantity: 90,
        reservedQuantity: 10
      });

      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { availableQuantity: 90, reservedQuantity: 10 }
      });
    });
  });
});
