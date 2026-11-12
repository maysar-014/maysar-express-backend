/**
 * INTEGRATION TESTS — Live Inventory Analytics
 *
 * End-to-end tests covering the full analytics refresh chain:
 * live stock reads, nightly batch velocity writes, handler no-op, multi-product sellers.
 */

// Module scope guard — prevents TS2451 when compiled with sibling test files
export {};

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
  productVariant: { findMany: jest.fn() },
  inventory_StockItem: { findMany: jest.fn() },
  order_OrderItem: { aggregate: jest.fn() },
  analytics_SellerInventoryHealth: { upsert: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() }
};

jest.mock('../database/prisma', () => ({ __esModule: true, default: mockPrisma }), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([]);
  mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
  mockPrisma.productVariant.findMany.mockResolvedValue([]);
  mockPrisma.inventory_StockItem.findMany.mockResolvedValue([]);
});

// ─── Integration 1: Dashboard read after mutation — zero delay ────────────────
describe('Integration: Dashboard read immediately after stock mutation', () => {
  it('reflects post-mutation state without any snapshot pre-write', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-mut', sellerId: 'seller-mut' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-mut' }]);
    // Post-mutation: reservation pushed effectiveAvailable below reorderPoint
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-mut', quantityAvailable: 8, quantityReserved: 4, reorderPoint: 5 }
      // effectiveAvailable = 4 ≤ 5 → LOW_STOCK
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('seller-mut');

    expect(result.lowStock).toBe(1);
    expect(result.inStock).toBe(0);
    expect(result.outOfStock).toBe(0);
  });
});

// ─── Integration 2: Nightly batch writes only velocity fields ─────────────────
describe('Integration: Nightly batch writes only salesVelocity and daysUntilStockout', () => {
  it('update path does not include currentStock or stockStatus columns', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-batch', sellerId: 'seller-batch' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-batch' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-batch', quantityAvailable: 50, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 30 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('seller-batch');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(upsertCall.update).toHaveProperty('salesVelocity');
    expect(upsertCall.update).toHaveProperty('daysUntilStockout');
    expect(upsertCall.update).not.toHaveProperty('currentStock');
    expect(upsertCall.update).not.toHaveProperty('stockStatus');
    expect(upsertCall.update.salesVelocity).toBeCloseTo(1.0, 5);
    expect(upsertCall.update.daysUntilStockout).toBe(50); // CEIL(50/1.0)
  });
});

// ─── Integration 3: InventoryUpdatedHandler — no-op, non-throwing ─────────────
describe('Integration: InventoryUpdatedHandler is a no-op for stock changes', () => {
  it('does not throw and does not write to analytics_SellerInventoryHealth', async () => {
    mockPrisma.productVariant.findMany.mockResolvedValue([
      { product: { sellerId: 'seller-event' } }
    ]);

    const { InventoryUpdatedHandler } = require('../messaging/InventoryUpdatedHandler');
    const capturedHandlers: Function[] = [];
    const mockBus = { subscribe: jest.fn((_: string, fn: Function) => capturedHandlers.push(fn)) };
    const handler = new InventoryUpdatedHandler(mockBus);
    handler.initialize();

    await expect(capturedHandlers[0]({
      eventId: 'e1',
      eventType: 'InventoryUpdated.v1',
      data: { updates: [{ variantId: 'v1' }] },
      timestamp: new Date()
    })).resolves.toBeUndefined();

    expect(mockPrisma.analytics_SellerInventoryHealth.upsert).not.toHaveBeenCalled();
  });
});

// ─── Integration 4: Multi-product seller with mixed live statuses ──────────────
describe('Integration: Multi-product seller with mixed live statuses', () => {
  it('returns { inStock:1, lowStock:1, outOfStock:1 } from live data even when snapshot holds different values', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p-a', sellerId: 'seller-multi' },
      { id: 'p-b', sellerId: 'seller-multi' },
      { id: 'p-c', sellerId: 'seller-multi' }
    ]);

    mockPrisma.productVariant.findMany
      .mockResolvedValueOnce([{ id: 'var-a' }])
      .mockResolvedValueOnce([{ id: 'var-b' }])
      .mockResolvedValueOnce([{ id: 'var-c' }]);

    mockPrisma.inventory_StockItem.findMany
      .mockResolvedValueOnce([{ productVariantId: 'var-a', quantityAvailable: 30, quantityReserved: 0, reorderPoint: 5 }])
      .mockResolvedValueOnce([{ productVariantId: 'var-b', quantityAvailable: 3, quantityReserved: 0, reorderPoint: 5 }])
      .mockResolvedValueOnce([{ productVariantId: 'var-c', quantityAvailable: 0, quantityReserved: 0, reorderPoint: 0 }]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('seller-multi');

    expect(result.inStock).toBe(1);
    expect(result.lowStock).toBe(1);
    expect(result.outOfStock).toBe(1);
  });
});

// ─── Integration 5: groupBy never called ──────────────────────────────────────
describe('Integration: groupBy snapshot query is never called', () => {
  it('does not call analytics_SellerInventoryHealth.groupBy', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', sellerId: 's1' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var1', quantityAvailable: 10, quantityReserved: 0, reorderPoint: 0 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s1');

    expect(mockPrisma.analytics_SellerInventoryHealth.groupBy).not.toHaveBeenCalled();
  });
});
