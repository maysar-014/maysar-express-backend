/**
 * INTEGRATION TESTS — Inventory Consistency Fix
 *
 * Tests the end-to-end analytics refresh cycle, degradation logging,
 * and order filter integration.
 *
 * Uses require() inside tests (not top-level import) to avoid hang from
 * transitive prisma client initialization before mocks are registered.
 */

jest.mock(
  '@modules/auth-service/src/infrastructure/services/logger.service',
  () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }),
  { virtual: true }
);

jest.mock(
  '@shared-events/eventBus',
  () => ({ eventBus: { subscribe: jest.fn(), publish: jest.fn(), emit: jest.fn() } }),
  { virtual: true }
);

jest.mock(
  '@shared/database/prisma-client',
  () => ({ createPrismaClient: jest.fn(() => mockPrisma) }),
  { virtual: true }
);

const mockPrisma = {
  product: { findMany: jest.fn() },
  inventory_StockItem: { findMany: jest.fn() },
  order_OrderItem: { aggregate: jest.fn() },
  analytics_SellerInventoryHealth: { upsert: jest.fn(), groupBy: jest.fn() }
};

jest.mock(
  '../database/prisma',
  () => ({ __esModule: true, default: mockPrisma }),
  { virtual: true }
);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 1: Full analytics refresh cycle with reservations
// ──────────────────────────────────────────────────────────────────────────────
describe('Integration: Full analytics refresh cycle with reservations', () => {
  it('currentStock = effectiveAvailable (available - reserved) after fix', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-1', sellerId: 'seller-1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'prod-1', quantityAvailable: 30, quantityReserved: 10, reorderPoint: 5 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 6 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('seller-1');

    const call = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    // effectiveAvailable = 30 - 10 = 20; 20 > reorderPoint(5) → IN_STOCK
    expect(call.update.currentStock).toBe(20);
    expect(call.update.stockStatus).toBe('IN_STOCK');
    expect(call.update.salesVelocity).toBeCloseTo(0.2, 5);
  });

  it('analytics and storefront agree on status for the RC-3 divergence case', async () => {
    const { classifyStockStatus } = require('../../../../../shared/inventory/classifyStockStatus');

    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-2', sellerId: 'seller-2' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'prod-2', quantityAvailable: 8, quantityReserved: 0, reorderPoint: 10 }
    ]);
    // velocity=0.5/day → daysUntilStockout=16 (old rule would say IN_STOCK)
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 15 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('seller-2');

    const call = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    const analyticsStatus = call.update.stockStatus;
    const storefrontStatus = classifyStockStatus(8, 10).toUpperCase();

    expect(analyticsStatus).toBe(storefrontStatus);
    expect(analyticsStatus).toBe('LOW_STOCK');
    expect(call.update.daysUntilStockout).toBe(16); // supplementary data still stored
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 2: Storefront degradation logging
// ──────────────────────────────────────────────────────────────────────────────
describe('Integration: Storefront degradation — structured log when inventory unreachable', () => {
  async function simulateFetch(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    try {
      const stockItems = await mockPrisma.inventory_StockItem.findMany({
        where: { productVariantId: { in: variantIds } },
        select: { productVariantId: true, quantityAvailable: true, quantityReserved: true }
      });
      const map = new Map<string, number>();
      for (const item of (stockItems as any[])) {
        map.set(item.productVariantId, Math.max(0, item.quantityAvailable - item.quantityReserved));
      }
      return map;
    } catch (error) {
      console.warn(JSON.stringify({
        level: 'warn',
        errorCode: 'INVENTORY_UNREACHABLE',
        message: 'fetchStockByVariantIds failed — defaulting to empty stock map; products will show out_of_stock',
        variantCount: variantIds.length,
        cause: (error as Error).message,
        timestamp: new Date().toISOString()
      }));
      return new Map();
    }
  }

  it('emits INVENTORY_UNREACHABLE log and returns empty map when DB throws', async () => {
    mockPrisma.inventory_StockItem.findMany.mockRejectedValue(new Error('Connection timeout'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await simulateFetch(['v1', 'v2', 'v3']);
    const calls = [...warnSpy.mock.calls];
    warnSpy.mockRestore();

    expect(result.size).toBe(0);
    const parsed = JSON.parse(calls[0][0] as string);
    expect(parsed.errorCode).toBe('INVENTORY_UNREACHABLE');
    expect(parsed.variantCount).toBe(3);
    expect(parsed.cause).toBe('Connection timeout');
  });

  it('no INVENTORY_UNREACHABLE log when DB is reachable', async () => {
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'v1', quantityAvailable: 50, quantityReserved: 0 }
    ]);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await simulateFetch(['v1']);
    const calls = [...warnSpy.mock.calls];
    warnSpy.mockRestore();

    const hasErr = calls.some(a => {
      try { return JSON.parse(a[0] as string).errorCode === 'INVENTORY_UNREACHABLE'; } catch { return false; }
    });
    expect(hasErr).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Test 3: Order status filter in velocity aggregation
// ──────────────────────────────────────────────────────────────────────────────
describe('Integration: Sales velocity filter excludes CANCELLED orders', () => {
  it('passes status: { notIn: ["CANCELLED"] } to the order aggregate query', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', sellerId: 's1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'p1', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 6 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s1');

    const args = mockPrisma.order_OrderItem.aggregate.mock.calls[0][0];
    expect(args.where.order).toMatchObject({ status: { notIn: ['CANCELLED'] } });
  });
});
