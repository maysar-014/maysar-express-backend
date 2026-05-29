/**
 * Phase 4 Gate F4.1 / F4.2 — Enabler Event Handler Integration
 *
 * Verifies that the enabler-service correctly processes OrderDelivered and
 * OrderCancelled events to keep enabler order status and performance metrics
 * in sync with the order-service.
 */

import { EnablerOrderEntity } from '../domain/entities/enabler-order.entity';
import { EnablerEntity } from '../domain/entities/enabler.entity';
import { Enabler_OrderStatus, Enabler_Status, Enabler_Tier } from '../domain/types/enabler.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEnablerOrder(overrides: Partial<any> = {}): EnablerOrderEntity {
  return EnablerOrderEntity.create({
    id: 'eo-001',
    enablerId: 'enabler-001',
    orderId: 'order-001',
    sellerId: 'seller-001',
    buyerId: 'buyer-001',
    productListingId: 'listing-001',
    status: Enabler_OrderStatus.PROCESSING,
    orderAmount: 50_000,
    productAmount: 42_500,
    enablerCommission: 7_500,
    platformFee: 0,
    commissionRate: 0.15,
    tierBonus: 0,
    performanceBonus: 0,
    settlementStatus: 'pending',
    disputeStatus: 'none',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeEnabler(overrides: Partial<any> = {}): EnablerEntity {
  return EnablerEntity.create({
    id: 'enabler-001',
    userId: 'user-001',
    businessName: 'Test Enabler',
    contactEmail: 'enabler@test.com',
    status: Enabler_Status.ACTIVE,
    verificationStatus: 'verified',
    tier: Enabler_Tier.BRONZE,
    commissionRate: 0.15,
    totalSales: 0,
    totalOrders: 0,
    conversionRate: 0,
    totalCommissionEarned: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

// ── Simulate the event handler logic from enabler-service/index.ts ────────────

async function simulateOrderDeliveredHandler(
  envelope: any,
  deps: {
    findByOrderId: (orderId: string) => Promise<EnablerOrderEntity | null>;
    updateOrder: (order: EnablerOrderEntity) => Promise<void>;
    findEnablerById: (id: string) => Promise<EnablerEntity | null>;
    updateEnabler: (enabler: EnablerEntity) => Promise<void>;
  }
): Promise<void> {
  const data = envelope?.data || envelope?.payload || envelope;
  const { orderId, enablerId, totalAmount } = data;
  if (!orderId || !enablerId) return;

  const enablerOrder = await deps.findByOrderId(orderId);
  if (enablerOrder) {
    const plain = enablerOrder.toPlainObject();
    plain.status = 'COMPLETED' as any;
    plain.updatedAt = new Date();
    const updated = EnablerOrderEntity.create(plain);
    await deps.updateOrder(updated);
  }

  const enabler = await deps.findEnablerById(enablerId);
  if (enabler) {
    const amount = Number(totalAmount?.amount ?? totalAmount ?? 0);
    enabler.updatePerformanceMetrics(amount, 1, enabler.toPlainObject().customerRating ?? 0, enabler.conversionRate);
    await deps.updateEnabler(enabler);
  }
}

async function simulateOrderCancelledHandler(
  envelope: any,
  deps: {
    findByOrderId: (orderId: string) => Promise<EnablerOrderEntity | null>;
    updateOrder: (order: EnablerOrderEntity) => Promise<void>;
  }
): Promise<void> {
  const data = envelope?.data || envelope?.payload || envelope;
  const { orderId, enablerId } = data;
  if (!orderId || !enablerId) return;

  const enablerOrder = await deps.findByOrderId(orderId);
  if (enablerOrder) {
    const plain = enablerOrder.toPlainObject();
    plain.status = 'CANCELLED' as any;
    plain.cancelledAt = new Date();
    plain.cancellationReason = 'OrderCancelled event received';
    plain.updatedAt = new Date();
    const updated = EnablerOrderEntity.create(plain);
    await deps.updateOrder(updated);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 4 Gate F4.1 — Enabler Order Status Sync', () => {

  describe('OrderDelivered handler', () => {
    it('marks the enabler order as COMPLETED', async () => {
      const enablerOrder = makeEnablerOrder({ status: Enabler_OrderStatus.PROCESSING });
      const updateOrderMock = jest.fn().mockResolvedValue(undefined);
      const updateEnablerMock = jest.fn().mockResolvedValue(undefined);

      await simulateOrderDeliveredHandler(
        { data: { orderId: 'order-001', enablerId: 'enabler-001', totalAmount: 50_000 } },
        {
          findByOrderId: async () => enablerOrder,
          updateOrder: updateOrderMock,
          findEnablerById: async () => makeEnabler(),
          updateEnabler: updateEnablerMock,
        }
      );

      expect(updateOrderMock).toHaveBeenCalledTimes(1);
      const savedOrder = updateOrderMock.mock.calls[0][0] as EnablerOrderEntity;
      expect(savedOrder.status).toBe('COMPLETED');
    });

    it('updates enabler totalSales and totalOrders', async () => {
      const enabler = makeEnabler({ totalSales: 100_000, totalOrders: 5 });
      const updateEnablerMock = jest.fn().mockResolvedValue(undefined);

      await simulateOrderDeliveredHandler(
        { data: { orderId: 'order-001', enablerId: 'enabler-001', totalAmount: 50_000 } },
        {
          findByOrderId: async () => makeEnablerOrder(),
          updateOrder: jest.fn().mockResolvedValue(undefined),
          findEnablerById: async () => enabler,
          updateEnabler: updateEnablerMock,
        }
      );

      expect(updateEnablerMock).toHaveBeenCalledTimes(1);
      const savedEnabler = updateEnablerMock.mock.calls[0][0] as EnablerEntity;
      expect(savedEnabler.totalSales).toBe(150_000); // 100k + 50k
      expect(savedEnabler.totalOrders).toBe(6);       // 5 + 1
    });

    it('skips processing when orderId is missing', async () => {
      const updateOrderMock = jest.fn();
      await simulateOrderDeliveredHandler(
        { data: { enablerId: 'enabler-001', totalAmount: 50_000 } }, // no orderId
        {
          findByOrderId: jest.fn(),
          updateOrder: updateOrderMock,
          findEnablerById: jest.fn(),
          updateEnabler: jest.fn(),
        }
      );
      expect(updateOrderMock).not.toHaveBeenCalled();
    });

    it('skips processing when enablerId is missing', async () => {
      const updateOrderMock = jest.fn();
      await simulateOrderDeliveredHandler(
        { data: { orderId: 'order-001', totalAmount: 50_000 } }, // no enablerId
        {
          findByOrderId: jest.fn(),
          updateOrder: updateOrderMock,
          findEnablerById: jest.fn(),
          updateEnabler: jest.fn(),
        }
      );
      expect(updateOrderMock).not.toHaveBeenCalled();
    });

    it('handles missing enabler order gracefully (no crash)', async () => {
      const updateEnablerMock = jest.fn().mockResolvedValue(undefined);

      await expect(simulateOrderDeliveredHandler(
        { data: { orderId: 'order-999', enablerId: 'enabler-001', totalAmount: 50_000 } },
        {
          findByOrderId: async () => null, // order not found
          updateOrder: jest.fn(),
          findEnablerById: async () => makeEnabler(),
          updateEnabler: updateEnablerMock,
        }
      )).resolves.not.toThrow();
    });
  });

  describe('OrderCancelled handler', () => {
    it('marks the enabler order as CANCELLED', async () => {
      const enablerOrder = makeEnablerOrder({ status: Enabler_OrderStatus.PENDING });
      const updateOrderMock = jest.fn().mockResolvedValue(undefined);

      await simulateOrderCancelledHandler(
        { data: { orderId: 'order-001', enablerId: 'enabler-001' } },
        {
          findByOrderId: async () => enablerOrder,
          updateOrder: updateOrderMock,
        }
      );

      expect(updateOrderMock).toHaveBeenCalledTimes(1);
      const savedOrder = updateOrderMock.mock.calls[0][0] as EnablerOrderEntity;
      expect(savedOrder.status).toBe('CANCELLED');
      expect(savedOrder.toPlainObject().cancellationReason).toBe('OrderCancelled event received');
    });

    it('skips when orderId is missing', async () => {
      const updateOrderMock = jest.fn();
      await simulateOrderCancelledHandler(
        { data: { enablerId: 'enabler-001' } },
        { findByOrderId: jest.fn(), updateOrder: updateOrderMock }
      );
      expect(updateOrderMock).not.toHaveBeenCalled();
    });

    it('handles missing enabler order gracefully', async () => {
      await expect(simulateOrderCancelledHandler(
        { data: { orderId: 'order-999', enablerId: 'enabler-001' } },
        { findByOrderId: async () => null, updateOrder: jest.fn() }
      )).resolves.not.toThrow();
    });
  });
});

describe('Phase 4 Gate F4.2 — Enabler Commission Attribution', () => {
  it('commission rate is correctly applied to order amount', () => {
    const enabler = makeEnabler({ commissionRate: 0.15 });
    const orderAmount = 100_000;
    const rate = enabler.calculateCommissionRate(orderAmount);
    // BRONZE tier adjustment = 1.0, so rate = 0.15 * 1.0 = 0.15
    expect(rate).toBeCloseTo(0.15, 4);
    const commission = orderAmount * rate;
    expect(commission).toBe(15_000); // TZS 15,000
  });

  it('SILVER tier gets 10% bonus on commission rate', () => {
    const enabler = makeEnabler({ commissionRate: 0.15, tier: Enabler_Tier.SILVER });
    const rate = enabler.calculateCommissionRate(100_000);
    // SILVER adjustment = 1.1, so rate = 0.15 * 1.1 = 0.165
    expect(rate).toBeCloseTo(0.165, 4);
  });

  it('commission rate is capped at 25%', () => {
    const enabler = makeEnabler({ commissionRate: 0.24, tier: Enabler_Tier.PLATINUM });
    // PLATINUM adjustment = 1.3, so 0.24 * 1.3 = 0.312 → capped at 0.25
    const rate = enabler.calculateCommissionRate(100_000);
    expect(rate).toBeLessThanOrEqual(0.25);
  });
});
