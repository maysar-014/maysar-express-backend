import { InventoryService } from '../inventoryService';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/eventBus';

jest.mock('@prisma/client');
jest.mock('../../../shared/events/eventBus');
jest.mock('../../../shared/outbox/outboxPattern');

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      inventory: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inventoryReservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    } as any;

    inventoryService = new InventoryService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reserveInventory', () => {
    const mockInventory = {
      id: 'inv-1',
      productVariantId: 'var-1',
      warehouseId: 'wh-1',
      availableQuantity: 100,
      reservedQuantity: 20,
    };

    beforeEach(() => {
      mockPrisma.inventory.findFirst.mockResolvedValue(mockInventory as any);
      mockPrisma.inventoryReservation.create.mockResolvedValue({ id: 'res-1' } as any);
      mockPrisma.inventory.update.mockResolvedValue({} as any);
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
      expect(mockPrisma.inventoryReservation.create).toHaveBeenCalled();
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

      expect(mockPrisma.inventoryReservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
          quantity: 10,
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

      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          availableQuantity: { decrement: 10 },
          reservedQuantity: { increment: 10 },
        },
      });
    });

    it('should throw error when insufficient stock', async () => {
      mockPrisma.inventory.findFirst.mockResolvedValue({
        ...mockInventory,
        availableQuantity: 5,
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
      mockPrisma.inventory.findFirst.mockResolvedValue(null);

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
      mockPrisma.inventory.findFirst
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
      expect(mockPrisma.inventoryReservation.create).toHaveBeenCalledTimes(2);
    });

    it('should rollback on partial failure', async () => {
      mockPrisma.inventory.findFirst
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
        quantity: 10,
        status: 'active',
      },
      {
        id: 'res-2',
        orderId: 'order-1',
        productVariantId: 'var-2',
        warehouseId: 'wh-1',
        quantity: 5,
        status: 'active',
      },
    ];

    beforeEach(() => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue(mockReservations as any);
      mockPrisma.inventoryReservation.update.mockResolvedValue({} as any);
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 } as any);
    });

    it('should release all reservations for an order', async () => {
      await inventoryService.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.inventoryReservation.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledTimes(2);
    });

    it('should update reservation status to released', async () => {
      await inventoryService.releaseInventory('order-1', 'order_cancelled');

      expect(mockPrisma.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'released' },
      });
    });

    it('should restore inventory quantities', async () => {
      await inventoryService.releaseInventory('order-1', 'payment_failed');

      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
        where: {
          productVariantId: 'var-1',
          warehouseId: 'wh-1',
        },
        data: {
          availableQuantity: { increment: 10 },
          reservedQuantity: { decrement: 10 },
        },
      });
    });

    it('should handle empty reservations', async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([]);

      await inventoryService.releaseInventory('order-999', 'expired');

      expect(mockPrisma.inventoryReservation.update).not.toHaveBeenCalled();
      expect(mockPrisma.inventory.updateMany).not.toHaveBeenCalled();
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
          type: 'ReorderCalculated',
          data: expect.objectContaining({
            productId: 'prod-1',
            reorderQuantity: 200,
            sagaId: 'saga-1',
          }),
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
          type: 'InventoryReserved',
          data: expect.objectContaining({
            orderId: 'order-1',
            productId: 'prod-1',
            quantity: 10,
          }),
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
          type: 'InventoryReleased',
          data: expect.objectContaining({
            orderId: 'order-1',
            productId: 'prod-1',
            quantity: 10,
          }),
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
          type: 'QualityTestingCompleted',
          data: expect.objectContaining({
            supplierId: 'sup-1',
            batchId: 'batch-1',
            testResults: expect.any(Object),
          }),
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
          type: 'QualityApprovalGranted',
          data: expect.objectContaining({
            approved: true,
          }),
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
          type: 'QualityApprovalGranted',
          data: expect.objectContaining({
            approved: false,
          }),
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
          type: 'QualityCertificateIssued',
          data: expect.objectContaining({
            supplierId: 'sup-1',
            batchId: 'batch-1',
            certificateId: expect.any(String),
          }),
        });
      });
    });
  });
});
