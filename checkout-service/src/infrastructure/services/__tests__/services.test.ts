import { InventoryReservationService } from '../inventory-reservation.service';
import { DiscountService } from '../discount.service';
import { OrderService } from '../order.service';

describe('InventoryReservationService Tests', () => {
  let service: InventoryReservationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      inventoryReservation: {
        create: jest.fn(),
        updateMany: jest.fn()
      }
    };
    service = new InventoryReservationService(mockPrisma);
  });

  describe('Reserve Operations', () => {
    it('should reserve inventory for checkout', async () => {
      const items = [
        { productId: 'prod-1', variantId: 'var-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 }
      ];

      await service.reserve('checkout-1', items);

      expect(mockPrisma.inventoryReservation.create).toHaveBeenCalledTimes(2);
    });

    it('should set expiration time', async () => {
      const items = [{ productId: 'prod-1', quantity: 1 }];

      await service.reserve('checkout-1', items);

      const call = mockPrisma.inventoryReservation.create.mock.calls[0];
      expect(call[0].data.expiresAt).toBeDefined();
    });
  });

  describe('Release Operations', () => {
    it('should release reserved inventory', async () => {
      await service.release('checkout-1');

      expect(mockPrisma.inventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { checkoutId: 'checkout-1' },
        data: { status: 'released' }
      });
    });
  });

  describe('Confirm Operations', () => {
    it('should confirm reserved inventory', async () => {
      await service.confirm('checkout-1');

      expect(mockPrisma.inventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { checkoutId: 'checkout-1' },
        data: { status: 'confirmed' }
      });
    });
  });
});

describe('DiscountService Tests', () => {
  let service: DiscountService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      appliedDiscount: {
        findFirst: jest.fn(),
        create: jest.fn()
      }
    };
    service = new DiscountService(mockPrisma);
  });

  describe('Validation Operations', () => {
    it('should validate existing discount code', async () => {
      mockPrisma.appliedDiscount.findFirst.mockResolvedValue({
        discountCode: 'SAVE10',
        maxUses: 100,
        currentUses: 5
      });

      const result = await service.validateCode('SAVE10');

      expect(result.valid).toBe(true);
      expect(result.discount).toBeDefined();
    });

    it('should reject non-existent discount code', async () => {
      mockPrisma.appliedDiscount.findFirst.mockResolvedValue(null);

      const result = await service.validateCode('INVALID');

      expect(result.valid).toBe(false);
    });

    it('should reject expired discount code', async () => {
      mockPrisma.appliedDiscount.findFirst.mockResolvedValue({
        discountCode: 'EXPIRED',
        maxUses: 10,
        currentUses: 10
      });

      const result = await service.validateCode('EXPIRED');

      expect(result.valid).toBe(false);
    });
  });

  describe('Apply Operations', () => {
    it('should apply discount to checkout', async () => {
      await service.applyDiscount('checkout-1', 'SAVE10', 10, 'fixed');

      expect(mockPrisma.appliedDiscount.create).toHaveBeenCalled();
    });
  });
});

describe('OrderService Tests', () => {
  let service: OrderService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      }
    };
    service = new OrderService(mockPrisma);
  });

  describe('Create Operations', () => {
    it('should create order from checkout', async () => {
      await service.createOrder('session-1', 'user-1', 100);

      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    it('should set order status to pending', async () => {
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        status: 'pending'
      });

      const result = await service.createOrder('session-1', 'user-1', 100);

      expect(result.status).toBe('pending');
    });
  });

  describe('Retrieval Operations', () => {
    it('should get order by id', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
        items: []
      });

      const result = await service.getOrder('order-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('order-1');
    });
  });

  describe('Update Operations', () => {
    it('should update order status', async () => {
      await service.updateOrderStatus('order-1', 'shipped');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'shipped', updatedAt: expect.any(Date) }
      });
    });
  });
});
