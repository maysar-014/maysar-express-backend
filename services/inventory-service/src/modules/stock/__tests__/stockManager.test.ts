import {
  StockManager,
  StockUpdate,
  StockManagerPrisma,
  StockItemRecord,
  ReservationRecord
} from '../stockManager';
import { EventBus } from '@shared-events/eventBus';

jest.mock('@prisma/client');
jest.mock('../../../../../shared/events/eventBus');

describe('StockManager', () => {
  type MockStockManagerPrisma = {
    stockItem: {
      findMany: jest.Mock<Promise<StockItemRecord[]>, [unknown]>;
      findUnique: jest.Mock<Promise<StockItemRecord | null>, [unknown]>;
      update: jest.Mock<Promise<StockItemRecord>, [unknown]>;
    };
    inventoryMovement: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
    };
    reservation: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
      findMany: jest.Mock<Promise<ReservationRecord[]>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [(callback: (tx: StockManagerPrisma) => Promise<unknown>) => Promise<unknown>]>;
  };

  let stockManager: StockManager;
  let mockPrisma: MockStockManagerPrisma;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockPrisma = {
      stockItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: {
        create: jest.fn(),
      },
      reservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    } as unknown as MockStockManagerPrisma;

    mockEventBus = {
      emit: jest.fn(),
    } as any;

    stockManager = new StockManager(mockPrisma as unknown as StockManagerPrisma, mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockLevel', () => {
    it('should return stock levels for a variant', async () => {
      const mockStockItems = [
        {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantityAvailable: 100,
          quantityReserved: 20,
          updatedAt: new Date(),
          reorderPoint: 10,
          warehouse: { id: 'wh-1', name: 'Main Warehouse' },
        },
      ];

      mockPrisma.stockItem.findMany.mockResolvedValue(mockStockItems as any);

      const result = await stockManager.getStockLevel('var-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        variantId: 'var-1',
        warehouseId: 'wh-1',
        available: 100,
        reserved: 20,
        total: 120,
        status: 'in_stock',
      });
    });

    it('should filter by warehouse when provided', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([]);

      await stockManager.getStockLevel('var-1', 'wh-1');

      expect(mockPrisma.stockItem.findMany).toHaveBeenCalledWith({
        where: { productVariantId: 'var-1', warehouseId: 'wh-1' },
        include: { warehouse: true },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should return low_stock status when at reorder point', async () => {
      const mockStockItems = [
        {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantityAvailable: 10,
          quantityReserved: 0,
          reorderPoint: 10,
          updatedAt: new Date(),
          warehouse: { id: 'wh-1' },
        },
      ];

      mockPrisma.stockItem.findMany.mockResolvedValue(mockStockItems as any);

      const result = await stockManager.getStockLevel('var-1');

      expect(result[0].status).toBe('low_stock');
    });

    it('should return out_of_stock status when quantity is zero', async () => {
      const mockStockItems = [
        {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantityAvailable: 0,
          quantityReserved: 0,
          reorderPoint: 10,
          updatedAt: new Date(),
          warehouse: { id: 'wh-1' },
        },
      ];

      mockPrisma.stockItem.findMany.mockResolvedValue(mockStockItems as any);

      const result = await stockManager.getStockLevel('var-1');

      expect(result[0].status).toBe('out_of_stock');
    });

    it('should return empty array when no stock found', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([]);
      const result = await stockManager.getStockLevel('var-999');
      expect(result).toEqual([]);
    });
  });

  describe('updateStock', () => {
    const mockStockItem = {
      id: 'stock-1',
      productVariantId: 'var-1',
      warehouseId: 'wh-1',
      quantityAvailable: 100,
      quantityReserved: 20,
      reorderPoint: 10,
      maxStock: 1000,
      unitCost: 50,
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.stockItem.findUnique.mockResolvedValue(mockStockItem as any);
      mockPrisma.stockItem.update.mockResolvedValue({ ...mockStockItem, quantityAvailable: 150 } as any);
      mockPrisma.inventoryMovement.create.mockResolvedValue({} as any);
    });

    it('should add stock correctly', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 50,
          operation: 'add',
          reason: 'Restock',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith({
        where: {
          productVariantId_warehouseId: {
            productVariantId: 'var-1',
            warehouseId: 'wh-1',
          },
        },
        data: {
          quantityAvailable: 150,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should subtract stock correctly', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 30,
          operation: 'subtract',
          reason: 'Sale',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityAvailable: 70,
          }),
        })
      );
    });

    it('should set stock to specific value', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 200,
          operation: 'set',
          reason: 'Inventory adjustment',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityAvailable: 200,
          }),
        })
      );
    });

    it('should not allow negative stock on subtract', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 150,
          operation: 'subtract',
          reason: 'Sale',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityAvailable: 0,
          }),
        })
      );
    });

    it('should record inventory movement', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 50,
          operation: 'add',
          reason: 'Restock',
          referenceId: 'po-123',
          referenceType: 'purchase_order',
          performedBy: 'user-1',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          movementType: 'inbound',
          quantity: 50,
          referenceType: 'purchase_order',
          referenceId: 'po-123',
          reason: 'Restock',
          performedBy: 'user-1',
          unitCost: 50,
        },
      });
    });

    it('should emit inventory updated event', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 50,
          operation: 'add',
          reason: 'Restock',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'InventoryUpdated.v1',
        expect.objectContaining({
          updates: expect.arrayContaining([
            expect.objectContaining({
              variantId: 'var-1',
              warehouseId: 'wh-1',
              quantity: 50,
              operation: 'add',
            }),
          ]),
        })
      );
    });

    it('should throw error for non-existent stock item', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue(null);

      const updates: StockUpdate[] = [
        {
          variantId: 'var-999',
          warehouseId: 'wh-1',
          quantity: 50,
          operation: 'add',
          reason: 'Restock',
        },
      ];

      await expect(stockManager.updateStock(updates)).rejects.toThrow('Stock item not found');
    });

    it('should throw error for invalid operation', async () => {
      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 50,
          operation: 'invalid' as any,
          reason: 'Test',
        },
      ];

      await expect(stockManager.updateStock(updates)).rejects.toThrow('Invalid operation');
    });

    it('should emit low stock alert when below reorder point', async () => {
      const lowStockItem = { ...mockStockItem, quantityAvailable: 5, reorderPoint: 10 };
      mockPrisma.stockItem.findUnique.mockResolvedValue(lowStockItem as any);
      mockPrisma.stockItem.update.mockResolvedValue(lowStockItem as any);

      const updates: StockUpdate[] = [
        {
          variantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 95,
          operation: 'subtract',
          reason: 'Sale',
        },
      ];

      await stockManager.updateStock(updates);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'LowStockAlert.v1',
        expect.objectContaining({
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          currentStock: 5,
          reorderPoint: 10,
          urgency: expect.any(String),
        })
      );
    });

    it('should handle multiple updates in batch', async () => {
      const updates: StockUpdate[] = [
        { variantId: 'var-1', warehouseId: 'wh-1', quantity: 10, operation: 'add', reason: 'Restock' },
        { variantId: 'var-2', warehouseId: 'wh-1', quantity: 5, operation: 'subtract', reason: 'Sale' }
      ];

      mockPrisma.stockItem.findUnique.mockResolvedValue(mockStockItem as any);

      await stockManager.updateStock(updates);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledTimes(2);
    });

    it('should throw when exceeding max stock', async () => {
      const updates: StockUpdate[] = [
        { variantId: 'var-1', warehouseId: 'wh-1', quantity: 2000, operation: 'set', reason: 'Adjustment' }
      ];

      await expect(stockManager.updateStock(updates)).rejects.toThrow('exceed maximum stock limit');
    });
  });

  describe('reserveStock', () => {
    const mockStockItem = {
      id: 'stock-1',
      productVariantId: 'var-1',
      warehouseId: 'wh-1',
      quantityAvailable: 100,
      quantityReserved: 20,
    };

    beforeEach(() => {
      mockPrisma.stockItem.findUnique.mockResolvedValue(mockStockItem as any);
      mockPrisma.reservation.create.mockResolvedValue({} as any);
      mockPrisma.stockItem.update.mockResolvedValue({} as any);
    });

    it('should reserve stock successfully', async () => {
      await stockManager.reserveStock('order-1', 'item-1', 'var-1', 'wh-1', 10);

      expect(mockPrisma.reservation.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          orderItemId: 'item-1',
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantityReserved: 10,
          expiresAt: expect.any(Date),
        },
      });

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith({
        where: {
          productVariantId_warehouseId: {
            productVariantId: 'var-1',
            warehouseId: 'wh-1',
          },
        },
        data: {
          quantityReserved: { increment: 10 },
        },
      });
    });

    it('should throw error when insufficient stock', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue({
        ...mockStockItem,
        quantityAvailable: 5,
      } as any);

      await expect(
        stockManager.reserveStock('order-1', 'item-1', 'var-1', 'wh-1', 10)
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw error when stock item not found', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValue(null);

      await expect(
        stockManager.reserveStock('order-1', 'item-1', 'var-1', 'wh-1', 10)
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('releaseStock', () => {
    const mockReservations = [
      {
        id: 'res-1',
        orderId: 'order-1',
        productVariantId: 'var-1',
        warehouseId: 'wh-1',
        quantityReserved: 10,
        status: 'active',
      },
      {
        id: 'res-2',
        orderId: 'order-1',
        productVariantId: 'var-2',
        warehouseId: 'wh-1',
        quantityReserved: 5,
        status: 'active',
      },
    ];

    beforeEach(() => {
      mockPrisma.reservation.findMany.mockResolvedValue(mockReservations as any);
      mockPrisma.reservation.update.mockResolvedValue({} as any);
      mockPrisma.stockItem.update.mockResolvedValue({} as any);
    });

    it('should release all reservations for an order', async () => {
      await stockManager.releaseStock('order-1', 'cancelled');

      expect(mockPrisma.reservation.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.stockItem.update).toHaveBeenCalledTimes(2);
    });

    it('should update reservation status to cancelled', async () => {
      await stockManager.releaseStock('order-1', 'cancelled');

      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'cancelled',
          }),
        })
      );
    });

    it('should update reservation status to expired', async () => {
      await stockManager.releaseStock('order-1', 'expired');

      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'expired',
          }),
        })
      );
    });

    it('should decrement reserved quantity', async () => {
      await stockManager.releaseStock('order-1', 'cancelled');

      expect(mockPrisma.stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            quantityReserved: { decrement: expect.any(Number) },
          },
        })
      );
    });

    it('should handle empty reservations', async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([]);
      await stockManager.releaseStock('order-999', 'cancelled');
      expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('reduceStock', () => {
    beforeEach(() => {
      mockPrisma.stockItem.findUnique.mockResolvedValue({
        id: 'stock-1',
        quantityAvailable: 100,
        quantityReserved: 0,
        reorderPoint: 10,
        maxStock: 1000,
        unitCost: 50,
      } as any);
      mockPrisma.stockItem.update.mockResolvedValue({} as any);
      mockPrisma.inventoryMovement.create.mockResolvedValue({} as any);
    });

    it('should reduce stock for order fulfillment', async () => {
      const items = [
        { variantId: 'var-1', warehouseId: 'wh-1', quantity: 10 },
        { variantId: 'var-2', warehouseId: 'wh-1', quantity: 5 },
      ];

      await stockManager.reduceStock('order-1', items);

      expect(mockPrisma.stockItem.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledTimes(2);
    });

    it('should record correct reference information', async () => {
      const items = [{ variantId: 'var-1', warehouseId: 'wh-1', quantity: 10 }];

      await stockManager.reduceStock('order-123', items);

      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceId: 'order-123',
          referenceType: 'order',
          reason: 'Order fulfillment',
        }),
      });
    });
  });
});
