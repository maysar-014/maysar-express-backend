import { InventoryService } from '../inventoryService';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '@shared-events/eventBus';

jest.mock('@prisma/client');
jest.mock('@shared-events/eventBus');
jest.mock('../../../../shared/outbox/outboxPattern');

describe('InventoryService', () => {
  type InventoryRecord = {
    id: string;
    productVariantId: string;
    warehouseId: string;
    quantityAvailable: number;
    quantityReserved: number;
  };

  type InventoryReservationRecord = {
    id: string;
    orderId: string;
    productVariantId: string;
    warehouseId: string;
    quantityReserved: number;
    status: string;
  };

  type InventoryServicePrismaMock = {
    inventory_StockItem: {
      findFirst: jest.Mock<Promise<InventoryRecord | null>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
      updateMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
    inventory_Reservation: {
      create: jest.Mock<Promise<unknown>, [unknown]>;
      findMany: jest.Mock<Promise<InventoryReservationRecord[]>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [(callback: (tx: InventoryServicePrismaMock) => Promise<unknown>) => Promise<unknown>]>;
  };

  let inventoryService: InventoryService;
  let mockPrisma: InventoryServicePrismaMock;

  beforeEach(() => {
    mockPrisma = {
      inventory_StockItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inventory_Reservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    } as unknown as InventoryServicePrismaMock;

    inventoryService = new InventoryService(mockPrisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reserveInventory', () => {
    const mockInventory = {
      id: 'inv-1',
      productVariantId: 'var-1',
      warehouseId: 'wh-1',
      quantityAvailable: 100,
      quantityReserved: 20,
    };

    beforeEach(() => {
      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue(mockInventory as any);
      mockPrisma.inventory_Reservation.create.mockResolvedValue({ id: 'res-1' } as any);
      mockPrisma.inventory_StockItem.update.mockResolvedValue({} as any);
    });

    it('should reserve inventory successfully', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          {
            productVariantId: 'var-1',
            quantity: 10,
            warehouseId: 'wh-1',
          },
        ],
      };

      const result = await inventoryService.reserveInventory(reservationData);

      expect(result.success).toBe(true);
      expect(result.reservationIds).toHaveLength(1);
      expect(mockPrisma.inventory_Reservation.create).toHaveBeenCalled();
    });

    it('should create reservation with correct data', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          {
            productVariantId: 'var-1',
            quantity: 10,
            warehouseId: 'wh-1',
          },
        ],
      };

      await inventoryService.reserveInventory(reservationData);

      expect(mockPrisma.inventory_Reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          orderItemId: expect.any(String),
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantityReserved: 10,
          status: 'active',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should update inventory quantities', async () => {
      const reservationData = {
        orderId: 'order-1',
        items: [
          {
            productVariantId: 'var-1',
            quantity: 10,
            warehouseId: 'wh-1',
          },
        ],
      };

      await inventoryService.reserveInventory(reservationData);

      expect(mockPrisma.inventory_StockItem.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          quantityAvailable: { decrement: 10 },
          quantityReserved: { increment: 10 },
        },
      });
    });

    it('should throw error when insufficient stock', async () => {
      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue({
        ...mockInventory,
        quantityAvailable: 5,
      } as any);

      const reservationData = {
        orderId: 'order-1',
        items: [
          {
            productVariantId: 'var-1',
            quantity: 10,
            warehouseId: 'wh-1',
          },
        ],
      };

      await expect(inventoryService.reserveInventory(reservationData)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should throw error when inventory not found', async () => {
      mockPrisma.inventory_StockItem.findFirst.mockResolvedValue(null);

      const reservationData = {
        orderId: 'order-1',
        items: [
          {
            productVariantId: 'var-999',
            quantity: 10,
            warehouseId: 'wh-1',
          },
        ],
      };

      await expect(inventoryService.reserveInventory(reservationData)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should handle multiple items reservation', async () => {
      mockPrisma.inventory_StockItem.findFirst
        .mockResolvedValueOnce({ ...mockInventory, productVariantId: 'var-1' } as any)
        .mockResolvedValueOnce({ ...mockInventory, productVariantId: 'var-2' } as any);

      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 10, warehouseId: 'wh-1' },
          { productVariantId: 'var-2', quantity: 5, warehouseId: 'wh-1' },
        ],
      };

      const result = await inventoryService.reserveInventory(reservationData);

      expect(result.reservationIds).toHaveLength(2);
      expect(mockPrisma.inventory_Reservation.create).toHaveBeenCalledTimes(2);
    });

    it('should rollback on partial failure', async () => {
      mockPrisma.inventory_StockItem.findFirst
        .mockResolvedValueOnce(mockInventory as any)
        .mockResolvedValueOnce(null);

      const reservationData = {
        orderId: 'order-1',
        items: [
          { productVariantId: 'var-1', quantity: 10, warehouseId: 'wh-1' },
          { productVariantId: 'var-2', quantity: 5, warehouseId: 'wh-1' },
        ],
      };

      await expect(inventoryService.reserveInventory(reservationData)).rejects.toThrow();
    });
  });

  describe('releaseInventory', () => {
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
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue(mockReservations as any);
      mockPrisma.inventory_Reservation.update.mockResolvedValue({} as any);
      mockPrisma.inventory_StockItem.updateMany.mockResolvedValue({ count: 1 } as any);
    });

    it('should release all reservations for an order', async () => {
      await inventoryService.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.inventory_Reservation.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory_StockItem.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should update reservation status to released', async () => {
      await inventoryService.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.inventory_Reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'cancelled' },
      });
    });

    it('should restore inventory quantities', async () => {
      await inventoryService.releaseInventory('order-1', 'payment_failed');

      expect(mockPrisma.inventory_StockItem.updateMany).toHaveBeenCalledWith({
        where: {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
        },
        data: {
          quantityAvailable: { increment: 10 },
          quantityReserved: { decrement: 10 },
        },
      });
    });

    it('should handle empty reservations', async () => {
      mockPrisma.inventory_Reservation.findMany.mockResolvedValue([]);

      await inventoryService.releaseInventory('order-999', 'expired');

      expect(mockPrisma.inventory_Reservation.update).not.toHaveBeenCalled();
      expect(mockPrisma.inventory_StockItem.updateMany).not.toHaveBeenCalled();
    });

    it('should process all reservations in transaction', async () => {
      await inventoryService.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Saga Event Handlers', () => {
    describe('Inventory Management Saga', () => {
      it('should handle StockChecked event and trigger reorder', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const stockCheckedHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'StockChecked'
        )?.[1];

        expect(stockCheckedHandler).toBeDefined();

        const mockPublish = eventBus.publish as jest.Mock;
        await stockCheckedHandler({
          type: 'StockChecked',
          data: { productId: 'prod-1', stockLevel: 5, reorderPoint: 10 },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'ReorderCalculated',
          data: expect.objectContaining({
            productId: 'prod-1',
            reorderQuantity: 200,
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });

      it('should not trigger reorder when stock above reorder point', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const stockCheckedHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'StockChecked'
        )?.[1];

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await stockCheckedHandler({
          type: 'StockChecked',
          data: { productId: 'prod-1', stockLevel: 50, reorderPoint: 10 },
          sagaId: 'saga-1',
        });

        expect(mockPublish).not.toHaveBeenCalled();
      });
    });

    describe('Order Processing Saga', () => {
      it('should handle OrderReceived event and reserve inventory', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const orderReceivedHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'OrderReceived'
        )?.[1];

        expect(orderReceivedHandler).toBeDefined();

        const mockPublish = eventBus.publish as jest.Mock;
        await orderReceivedHandler({
          type: 'OrderReceived',
          data: {
            orderId: 'order-1',
            items: [
              { productId: 'prod-1', quantity: 10 },
              { productId: 'prod-2', quantity: 5 },
            ],
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledTimes(2);
        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'InventoryReserved',
          data: expect.objectContaining({
            orderId: 'order-1',
            productId: 'prod-1',
            quantity: 10,
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });

      it('should handle PaymentFailed event and release inventory', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const paymentFailedHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'PaymentFailed'
        )?.[1];

        expect(paymentFailedHandler).toBeDefined();

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await paymentFailedHandler({
          type: 'PaymentFailed',
          data: {
            orderId: 'order-1',
            items: [{ productId: 'prod-1', quantity: 10 }],
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'InventoryReleased',
          data: expect.objectContaining({
            orderId: 'order-1',
            productId: 'prod-1',
            quantity: 10,
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });
    });

    describe('Quality Control Saga', () => {
      it('should handle QualityInspectionStarted event', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const qualityInspectionHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'QualityInspectionStarted'
        )?.[1];

        expect(qualityInspectionHandler).toBeDefined();

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await qualityInspectionHandler({
          type: 'QualityInspectionStarted',
          data: {
            supplierId: 'sup-1',
            batchId: 'batch-1',
            products: ['prod-1', 'prod-2'],
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'QualityTestingCompleted',
          data: expect.objectContaining({
            supplierId: 'sup-1',
            batchId: 'batch-1',
            testResults: expect.any(Object),
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });

      it('should approve quality when pass rate above threshold', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const qualityTestingHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'QualityTestingCompleted'
        )?.[1];

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await qualityTestingHandler({
          type: 'QualityTestingCompleted',
          data: {
            supplierId: 'sup-1',
            batchId: 'batch-1',
            testResults: { passRate: 0.98 },
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'QualityApprovalGranted',
          data: expect.objectContaining({
            approved: true,
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });

      it('should reject quality when pass rate below threshold', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const qualityTestingHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'QualityTestingCompleted'
        )?.[1];

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await qualityTestingHandler({
          type: 'QualityTestingCompleted',
          data: {
            supplierId: 'sup-1',
            batchId: 'batch-1',
            testResults: { passRate: 0.90 },
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'QualityApprovalGranted',
          data: expect.objectContaining({
            approved: false,
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });

      it('should issue certificate when quality approved', async () => {
        const mockSubscribe = eventBus.subscribe as jest.Mock;
        const qualityApprovalHandler = mockSubscribe.mock.calls.find(
          (call) => call[0] === 'QualityApprovalGranted'
        )?.[1];

        const mockPublish = eventBus.publish as jest.Mock;
        mockPublish.mockClear();

        await qualityApprovalHandler({
          type: 'QualityApprovalGranted',
          data: {
            supplierId: 'sup-1',
            batchId: 'batch-1',
            approved: true,
          },
          sagaId: 'saga-1',
        });

        expect(mockPublish).toHaveBeenCalledWith({
          eventType: 'QualityCertificateIssued',
          data: expect.objectContaining({
            supplierId: 'sup-1',
            batchId: 'batch-1',
            certificateId: expect.any(String),
          }),
          metadata: { sagaId: 'saga-1' },
        });
      });
    });
  });
});
