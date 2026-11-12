/**
 * PRESERVATION PROPERTY TESTS — Live Inventory Analytics
 *
 * EXPECTED: All tests PASS on both unfixed AND fixed code.
 * Preservation properties:
 *   P-1: Consistent snapshot inputs return unchanged counts
 *   P-2: salesVelocity computation is unchanged
 *   P-3: Response shape { inStock, lowStock, outOfStock } is unchanged
 *   P-4: classifyStockStatus rules unchanged (PBT)
 *   P-5: daysUntilStockout formula preserved
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

import * as fc from 'fast-check';
import { classifyStockStatus } from '../../../../../shared/inventory/classifyStockStatus';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([]);
  mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
  mockPrisma.productVariant.findMany.mockResolvedValue([]);
  mockPrisma.inventory_StockItem.findMany.mockResolvedValue([]);
});

// ─── P-1: Consistent snapshot → counts unchanged ─────────────────────────────
describe('P-1: Consistent snapshot → same counts as original', () => {
  it('returns inStock=1 when snapshot and live both agree on IN_STOCK', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-1', sellerId: 's1' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-1', quantityAvailable: 20, quantityReserved: 0, reorderPoint: 5 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s1');

    expect(result.inStock).toBe(1);
    expect(result.lowStock).toBe(0);
    expect(result.outOfStock).toBe(0);
  });

  it('returns lowStock=1 when snapshot and live both agree on LOW_STOCK', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-2', sellerId: 's2' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-2' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-2', quantityAvailable: 3, quantityReserved: 0, reorderPoint: 5 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s2');

    expect(result.lowStock).toBe(1);
    expect(result.inStock).toBe(0);
    expect(result.outOfStock).toBe(0);
  });
});

// ─── P-2: salesVelocity computation unchanged ────────────────────────────────
describe('P-2: salesVelocity computation is unchanged', () => {
  it('computes salesVelocity from 30-day non-CANCELLED aggregate', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-vel-1', sellerId: 's-vel-1' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-vel-1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-vel-1', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 30 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-vel-1');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(upsertCall.update.salesVelocity).toBeCloseTo(1.0, 5);
  });

  it('CANCELLED order filter is in the aggregate where clause', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-vel-2', sellerId: 's-vel-2' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-vel-2' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-vel-2', quantityAvailable: 50, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 6 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-vel-2');

    const aggregateCall = mockPrisma.order_OrderItem.aggregate.mock.calls[0][0];
    expect(aggregateCall.where.order.status).toEqual({ notIn: ['CANCELLED'] });
  });
});

// ─── P-3: Response shape unchanged ───────────────────────────────────────────
describe('P-3: Response shape { inStock, lowStock, outOfStock } unchanged', () => {
  it('returns object with inStock, lowStock, outOfStock as numbers', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-shape', sellerId: 's-shape' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-shape' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-shape', quantityAvailable: 10, quantityReserved: 0, reorderPoint: 0 }
    ]);

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    const result = await new CalculateInventoryHealth().execute('s-shape');

    expect(result).toHaveProperty('inStock');
    expect(result).toHaveProperty('lowStock');
    expect(result).toHaveProperty('outOfStock');
    expect(typeof result.inStock).toBe('number');
    expect(typeof result.lowStock).toBe('number');
    expect(typeof result.outOfStock).toBe('number');
  });
});

// ─── P-4: classifyStockStatus rules unchanged (PBT) ──────────────────────────
describe('P-4: classifyStockStatus rules unchanged', () => {
  it('is non-decreasing as effectiveAvailable increases (PBT)', () => {
    const order = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 500 }),
        (base, delta, rp) => order[classifyStockStatus(base + delta, rp)] >= order[classifyStockStatus(base, rp)]
      ),
      { numRuns: 500 }
    );
  });

  it('always out_of_stock when effectiveAvailable=0 (PBT)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (rp) => classifyStockStatus(0, rp) === 'out_of_stock'),
      { numRuns: 300 }
    );
  });

  it('always in_stock when reorderPoint=0 and available>0 (PBT)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (a) => classifyStockStatus(a, 0) === 'in_stock'),
      { numRuns: 300 }
    );
  });
});

// ─── P-5: daysUntilStockout formula preserved ────────────────────────────────
describe('P-5: daysUntilStockout formula preserved', () => {
  it('daysUntilStockout = CEIL(currentStock / salesVelocity) when velocity > 0', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-days-1', sellerId: 's-days-1' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-days-1' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-days-1', quantityAvailable: 20, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-days-1');

    const call = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(call.update.salesVelocity).toBeCloseTo(10 / 30, 3);
    expect(call.update.daysUntilStockout).toBe(Math.ceil(20 / call.update.salesVelocity));
  });

  it('daysUntilStockout = 999 when salesVelocity = 0', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-days-2', sellerId: 's-days-2' }]);
    mockPrisma.productVariant.findMany.mockResolvedValue([{ id: 'var-days-2' }]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'var-days-2', quantityAvailable: 50, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

    const { CalculateInventoryHealth } = require('../../application/use-cases/CalculateInventoryHealth');
    await new CalculateInventoryHealth().execute('s-days-2');

    const call = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0][0];
    expect(call.update.salesVelocity).toBe(0);
    expect(call.update.daysUntilStockout).toBe(999);
  });
});
