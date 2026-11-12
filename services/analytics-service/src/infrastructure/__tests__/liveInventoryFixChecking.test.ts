/**
 * FIX-CHECKING UNIT TESTS — Live Inventory Analytics
 *
 * All tests PASS on fixed code.
 * Verifies each behavioral requirement of the live inventory read path.
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

// ─── Core fix: live stock overrides stale snapshot ────────────────────────────
describe('Fix: execute() returns counts from live inventory_StockItem, not snapshot', () => {
  it('returns lowStock=1 when live effectiveAvailable(4) <= reorderPoint(5), snapshot says IN_STOCK', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', sellerId: 's1' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-p1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-p1', quantityAvailable: 7, quantityReserved: 3, reorderPoint: 5 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s1');

    expect(result.lowStock).toBe(1);
    expect(result.inStock).toBe(0);
    expect(result.outOfStock).toBe(0);
  });

  it('returns outOfStock=1 when live effectiveAvailable=0, snapshot says IN_STOCK', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p2', sellerId: 's2' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-p2' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-p2', quantityAvailable: 0, quantityReserved: 0, reorderPoint: 0 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s2');

    expect(result.outOfStock).toBe(1);
    expect(result.inStock).toBe(0);
  });

  it('returns correct counts across mixed live statuses (IN/LOW/OUT)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p-in', sellerId: 's-mix' },
      { id: 'p-low', sellerId: 's-mix' },
      { id: 'p-out', sellerId: 's-mix' }
    ]);
    // Return variant per product in sequence
    mockPrisma.productVariant.findMany
      .mockResolvedValueOnce([{ id: 'var-in' }])
      .mockResolvedValueOnce([{ id: 'var-low' }])
      .mockResolvedValueOnce([{ id: 'var-out' }]);
    mockPrisma.inventory_StockItem.findMany
      .mockResolvedValueOnce([{ productVariantId: 'var-in', quantityAvailable: 20, quantityReserved: 0, reorderPoint: 5 }])
      .mockResolvedValueOnce([{ productVariantId: 'var-low', quantityAvailable: 3, quantityReserved: 0, reorderPoint: 5 }])
      .mockResolvedValueOnce([{ productVariantId: 'var-out', quantityAvailable: 0, quantityReserved: 0, reorderPoint: 0 }]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s-mix');

    expect(result.inStock).toBe(1);
    expect(result.lowStock).toBe(1);
    expect(result.outOfStock).toBe(1);
  });
});

// ─── Upsert: only velocity fields written on update ──────────────────────────
describe('Fix: upsert only writes salesVelocity and daysUntilStockout on update', () => {
  it('update block does NOT contain currentStock or stockStatus', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-up', sellerId: 's-up' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-up' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-up', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-up');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(upsertCall.update).not.toHaveProperty('currentStock');
    expect(upsertCall.update).not.toHaveProperty('stockStatus');
    expect(upsertCall.update).toHaveProperty('salesVelocity');
    expect(upsertCall.update).toHaveProperty('daysUntilStockout');
  });

  it('create block retains currentStock and stockStatus for new rows', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-cr', sellerId: 's-cr' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-cr' }]);
    // effectiveAvailable = 50 - 5 = 45, reorderPoint=10 → IN_STOCK
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-cr', quantityAvailable: 50, quantityReserved: 5, reorderPoint: 10 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-cr');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(upsertCall.create).toHaveProperty('currentStock');
    expect(upsertCall.create).toHaveProperty('stockStatus');
    expect(upsertCall.create.currentStock).toBe(45);
    expect(upsertCall.create.stockStatus).toBe('IN_STOCK');
  });
});

// ─── daysUntilStockout uses live currentStock ─────────────────────────────────
describe('Fix: daysUntilStockout computed from live currentStock', () => {
  it('uses live currentStock (40 = 50 - 10) for daysUntilStockout when velocity > 0', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-ds', sellerId: 's-ds' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-ds' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-ds', quantityAvailable: 50, quantityReserved: 10, reorderPoint: 0 }
    ]);
    // velocity = 15/30 = 0.5/day → CEIL(40/0.5) = 80
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 15 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-ds');

    const call = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(call.update.daysUntilStockout).toBe(80);
  });
});

// ─── Graceful: no snapshot row ───────────────────────────────────────────────
describe('Fix: graceful handling when no analytics_SellerInventoryHealth row exists', () => {
  it('does not crash and returns live counts when snapshot row is absent', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-new', sellerId: 's-new' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-new' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-new', quantityAvailable: 25, quantityReserved: 0, reorderPoint: 0 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s-new');

    expect(result.inStock).toBe(1);
    expect(result.lowStock).toBe(0);
    expect(result.outOfStock).toBe(0);
  });
});

// ─── InventoryUpdatedHandler: no execute() call ──────────────────────────────
describe('Fix: InventoryUpdatedHandler does not call CalculateInventoryHealth.execute()', () => {
  it('subscribes to InventoryUpdated.v1 without throwing', () => {
    const { InventoryUpdatedHandler } = require('../messaging/InventoryUpdatedHandler');
    const mockBus = { subscribe: jest.fn() };
    const handler = new InventoryUpdatedHandler(mockBus);
    handler.initialize();
    expect(mockBus.subscribe).toHaveBeenCalledWith('InventoryUpdated.v1', expect.any(Function));
  });

  it('handles event without writing to analytics_SellerInventoryHealth', async () => {
    mockPrisma.productVariant.findMany.mockResolvedValue([
      { product: { sellerId: 'seller-event' } }
    ]);

    const { InventoryUpdatedHandler } = require('../messaging/InventoryUpdatedHandler');
    const captured: Function[] = [];
    const mockBus = { subscribe: jest.fn((_: string, fn: Function) => captured.push(fn)) };
    const handler = new InventoryUpdatedHandler(mockBus);
    handler.initialize();

    await expect(captured[0]({
      eventId: 'e1',
      eventType: 'InventoryUpdated.v1',
      data: { updates: [{ variantId: 'v1' }] },
      timestamp: new Date()
    })).resolves.toBeUndefined();

    expect(mockPrisma.analytics_SellerInventoryHealth.upsert).not.toHaveBeenCalled();
  });
});

// ─── groupBy never called ─────────────────────────────────────────────────────
describe('Fix: groupBy snapshot query is never called', () => {
  it('does not call analytics_SellerInventoryHealth.groupBy', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-gb', sellerId: 's-gb' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-gb' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-gb', quantityAvailable: 10, quantityReserved: 0, reorderPoint: 0 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-gb');

    expect(mockPrisma.analytics_SellerInventoryHealth.groupBy).not.toHaveBeenCalled();
  });
});
