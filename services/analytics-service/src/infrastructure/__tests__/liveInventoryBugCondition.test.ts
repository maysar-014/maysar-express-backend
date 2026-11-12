/**
 * BUG CONDITION EXPLORATION — Live Inventory Analytics
 *
 * EXPECTED: Tests in this file FAIL on unfixed code.
 * Confirms that execute() reads stockStatus counts from the stale snapshot
 * instead of computing them live from inventory_StockItem.
 *
 * Bug condition C(X): snapshotStock ≠ liveStock at query time
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

// Use uniquely-named mock object to avoid TS2451 when compiled alongside sibling test files
const mockPrismaBC = {
  product: { findMany: jest.fn() },
  productVariant: { findMany: jest.fn() },
  inventory_StockItem: { findMany: jest.fn() },
  order_OrderItem: { aggregate: jest.fn() },
  analytics_SellerInventoryHealth: { upsert: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() }
};

jest.mock('@shared/database/prisma-client', () => ({ createPrismaClient: jest.fn(() => mockPrismaBC) }), { virtual: true });
jest.mock('../database/prisma', () => ({ __esModule: true, default: mockPrismaBC }), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaBC.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});
  mockPrismaBC.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrismaBC.analytics_SellerInventoryHealth.findMany.mockResolvedValue([]);
  mockPrismaBC.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
  mockPrismaBC.productVariant.findMany.mockResolvedValue([]);
  mockPrismaBC.inventory_StockItem.findMany.mockResolvedValue([]);
});

describe('Bug Condition: stale snapshot causes wrong stockStatus counts', () => {
  /**
   * Scenario: A reservation was placed after the last snapshot write.
   *   live: effectiveAvailable = 7 - 3 = 4, reorderPoint=5 → LOW_STOCK
   *   snapshot: stockStatus='IN_STOCK'
   * Fixed: must return lowStock=1 from live data.
   * Unfixed: returns inStock=1 from stale snapshot.
   */
  it('returns lowStock=1 when live effectiveAvailable(4) <= reorderPoint(5), snapshot says IN_STOCK', async () => {
    mockPrismaBC.product.findMany.mockResolvedValue([{ id: 'prod-1', sellerId: 'seller-1' }]);
    mockPrismaBC.productVariant.findMany.mockResolvedValue([{ id: 'var-1' }]);
    mockPrismaBC.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-1', quantityAvailable: 7, quantityReserved: 3, reorderPoint: 5 }
    ]);
    mockPrismaBC.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
      { stockStatus: 'IN_STOCK', _count: { id: 1 } }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('seller-1');

    expect(result.lowStock).toBe(1);
    expect(result.inStock).toBe(0);
  });

  /**
   * Scenario: Stock fully depleted.
   *   live: effectiveAvailable = 0 → OUT_OF_STOCK
   *   snapshot: stockStatus='IN_STOCK'
   * Fixed: must return outOfStock=1.
   * Unfixed: returns inStock=1.
   */
  it('returns outOfStock=1 when live effectiveAvailable=0, snapshot says IN_STOCK', async () => {
    mockPrismaBC.product.findMany.mockResolvedValue([{ id: 'prod-2', sellerId: 'seller-2' }]);
    mockPrismaBC.productVariant.findMany.mockResolvedValue([{ id: 'var-2' }]);
    mockPrismaBC.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-2', quantityAvailable: 0, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrismaBC.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
      { stockStatus: 'IN_STOCK', _count: { id: 1 } }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('seller-2');

    expect(result.outOfStock).toBe(1);
    expect(result.inStock).toBe(0);
  });
});

/**
 * Counterexamples (unfixed behavior):
 * Test 1: effectiveAvailable=4, reorderPoint=5 → LOW_STOCK live
 *   Unfixed: { inStock:1, lowStock:0 } (reads stale snapshot)
 *   Fixed:   { inStock:0, lowStock:1 } (reads live inventory_StockItem)
 *
 * Test 2: effectiveAvailable=0 → OUT_OF_STOCK live
 *   Unfixed: { inStock:1, outOfStock:0 } (reads stale snapshot)
 *   Fixed:   { inStock:0, outOfStock:1 } (reads live inventory_StockItem)
 */
