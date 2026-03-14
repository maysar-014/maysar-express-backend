/**
 * Integration Tests - Services
 * Tests external service integrations
 */

import { InventoryReservationService } from '../../services/inventory-reservation.service';
import { DiscountService } from '../../services/discount.service';
import { OrderService } from '../../services/order.service';

describe('InventoryReservationService', () => {
  let service: InventoryReservationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      checkout_InventoryReservation: {
        upsert: jest.fn().mockResolvedValue({ id: 'res-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      }
    };
    service = new InventoryReservationService(mockPrisma);
  });

  it('should reserve inventory', async () => {
    const items = [{ productId: 'prod-1', quantity: 2 }];

    await service.reserve('checkout-1', items);

    expect(mockPrisma.checkout_InventoryReservation.upsert).toHaveBeenCalled();
  });

  it('should release inventory', async () => {
    await service.release('checkout-1');

    expect(mockPrisma.checkout_InventoryReservation.updateMany).toHaveBeenCalledWith({
      where: { checkoutId: 'checkout-1' },
      data: { status: 'released' }
    });
  });

  it('should confirm inventory', async () => {
    await service.confirm('checkout-1');

    expect(mockPrisma.checkout_InventoryReservation.updateMany).toHaveBeenCalledWith({
      where: { checkoutId: 'checkout-1' },
      data: { status: 'confirmed' }
    });
  });
});

describe('DiscountService', () => {
  let service: DiscountService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      checkout_AppliedDiscount: {
        findFirst: jest.fn().mockResolvedValue({
          discountCode: 'SAVE10',
          maxUses: 100,
          currentUses: 5
        }),
        create: jest.fn().mockResolvedValue({ id: 'disc-1' })
      }
    };
    service = new DiscountService(mockPrisma);
  });

  it('should validate discount code', async () => {
    const result = await service.validateCode('SAVE10');

    expect(result.valid).toBe(true);
    expect(result.discount).toBeDefined();
  });

  it('should reject expired discount', async () => {
    mockPrisma.checkout_AppliedDiscount.findFirst.mockResolvedValueOnce({
      discountCode: 'EXPIRED',
      maxUses: 10,
      currentUses: 10
    });

    const result = await service.validateCode('EXPIRED');

    expect(result.valid).toBe(false);
  });

  it('should apply discount', async () => {
    await service.applyDiscount('checkout-1', 'SAVE10', 10, 'fixed');

    expect(mockPrisma.checkout_AppliedDiscount.create).toHaveBeenCalled();
  });
});

describe('OrderService', () => {
  let service: OrderService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        create: jest.fn().mockResolvedValue({ id: 'order-1', status: 'pending' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: 'pending' }),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: 'shipped' })
      }
    };
    service = new OrderService(mockPrisma);
  });

  it('should create order', async () => {
    const result = await service.createOrder('session-1', 'user-1', 100);

    expect(result.status).toBe('pending');
    expect(mockPrisma.order.create).toHaveBeenCalled();
  });

  it('should retrieve order', async () => {
    const result = await service.getOrder('order-1');

    expect(result).toBeDefined();
    expect(result.id).toBe('order-1');
  });

  it('should update order status', async () => {
    await service.updateOrderStatus('order-1', 'shipped');

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'shipped', updatedAt: expect.any(Date) }
    });
  });
});
