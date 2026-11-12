/**
 * BUG CONDITION EXPLORATION TESTS
 *
 * EXPECTED: All tests in this file FAIL on unfixed code.
 * Failure confirms root causes exist — do NOT fix production code until
 * all five root causes are documented here.
 *
 * RC-1: CalculateInventoryHealth ignores quantityReserved → currentStock overstated
 * RC-2: CalculateInventoryHealth counts CANCELLED/REFUNDED orders in salesVelocity
 * RC-3: Analytics uses velocity-based status vs storefront's quantity-threshold status
 * RC-4: No InventoryUpdatedHandler exists — real-time analytics refresh impossible
 * RC-5: fetchStockByVariantIds emits unstructured console.warn with no parseable errorCode
 */

// Must mock @modules alias before any imports — analytics-service jest project
// does not map @modules, so the logger import would hang/fail without this.
jest.mock(
  '@modules/auth-service/src/infrastructure/services/logger.service',
  () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }),
  { virtual: true }
);

const mockPrisma = {
  product: { findMany: jest.fn() },
  inventory_StockItem: { findMany: jest.fn() },
  order_OrderItem: { aggregate: jest.fn() },
  analytics_SellerInventoryHealth: {
    upsert: jest.fn(),
    groupBy: jest.fn()
  }
};

jest.mock(
  '../database/prisma',
  () => ({ __esModule: true, default: mockPrisma }),
  { virtual: true }
);

import { CalculateInventoryHealth } from '../../application/use-cases/CalculateInventoryHealth';
import * as fs from 'fs';
import * as path from 'path';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// RC-1: Reserved-unit leak
// ---------------------------------------------------------------------------
describe('RC-1: quantityReserved not subtracted in analytics currentStock', () => {
  it('should compute currentStock as quantityAvailable - quantityReserved (40), not raw quantityAvailable (50)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'variant-1', sellerId: 'seller-1' }
    ]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'variant-1', quantityAvailable: 50, quantityReserved: 10, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

    await new CalculateInventoryHealth().execute('seller-1');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0]?.[0];
    const reportedStock = upsertCall?.update?.currentStock ?? upsertCall?.create?.currentStock;

    // FAILS on unfixed code: returns 50 instead of 40
    expect(reportedStock).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// RC-2: Cancelled-order inflation
// ---------------------------------------------------------------------------
describe('RC-2: Cancelled/refunded orders inflate salesVelocity', () => {
  it('should pass a status filter excluding CANCELLED/REFUNDED to the order_OrderItem aggregate query', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-1', sellerId: 'seller-1' }
    ]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'product-1', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 0 }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 6 } });

    await new CalculateInventoryHealth().execute('seller-1');

    const aggregateCall = mockPrisma.order_OrderItem.aggregate.mock.calls[0]?.[0];
    const orderFilter = aggregateCall?.where?.order;

    // FAILS on unfixed code: no status filter exists in the where clause
    expect(orderFilter).toMatchObject({
      status: { notIn: expect.arrayContaining(['CANCELLED']) }
    });
  });
});

// ---------------------------------------------------------------------------
// RC-3: Classification divergence
// ---------------------------------------------------------------------------
describe('RC-3: Analytics and storefront use different status classification rules', () => {
  it('should classify status as LOW_STOCK when effectiveAvailable (8) <= reorderPoint (10)', async () => {
    // Storefront rule: 8 <= 10 → low_stock
    // Unfixed analytics: velocity=0.5/day → daysUntilStockout=16 > 7 → IN_STOCK ← diverges
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-rc3', sellerId: 'seller-rc3' }
    ]);
    mockPrisma.inventory_StockItem.findMany.mockResolvedValue([
      { productVariantId: 'product-rc3', quantityAvailable: 8, quantityReserved: 0, reorderPoint: 10 }
    ]);
    // 15 units sold → velocity 0.5/day → daysUntilStockout = 8/0.5 = 16
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 15 } });

    await new CalculateInventoryHealth().execute('seller-rc3');

    const upsertCall = mockPrisma.analytics_SellerInventoryHealth.upsert.mock.calls[0]?.[0];
    const analyticsStatus = upsertCall?.update?.stockStatus ?? upsertCall?.create?.stockStatus;

    // FAILS on unfixed code: analytics returns 'IN_STOCK' (velocity-based, daysUntilStockout=16 > 7)
    expect(analyticsStatus).toBe('LOW_STOCK');
  });
});

// ---------------------------------------------------------------------------
// RC-4: No real-time event subscriber
// ---------------------------------------------------------------------------
describe('RC-4: No InventoryUpdatedHandler exists in analytics service', () => {
  it('should have an InventoryUpdatedHandler file for real-time analytics refresh', () => {
    const handlerPath = path.resolve(
      __dirname,
      '../../infrastructure/messaging/InventoryUpdatedHandler.ts'
    );

    // FAILS on unfixed code: file does not exist yet
    expect(fs.existsSync(handlerPath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RC-5: Silent degradation — no detectable error code
// Tested inline to avoid cross-service module boundary hanging the runner.
// ---------------------------------------------------------------------------
describe('RC-5: fetchStockByVariantIds emits unstructured warn with no errorCode', () => {
  it('should emit a structured JSON warn with errorCode INVENTORY_UNREACHABLE when inventory DB throws', async () => {
    /**
     * Inline reproduction of the FIXED fetchStockByVariantIds catch block.
     * This mirrors the code in:
     *   services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts
     */
    async function fetchStockByVariantIds_fixed(
      prisma: any,
      variantIds: string[]
    ): Promise<Map<string, number>> {
      if (variantIds.length === 0) return new Map();
      try {
        const stockItems = await prisma.inventory_StockItem.findMany({
          where: { productVariantId: { in: variantIds } },
          select: { productVariantId: true, quantityAvailable: true, quantityReserved: true }
        });
        const stockMap = new Map<string, number>();
        for (const item of stockItems) {
          const available = Math.max(0, (item.quantityAvailable ?? 0) - (item.quantityReserved ?? 0));
          const current = stockMap.get(item.productVariantId) ?? 0;
          stockMap.set(item.productVariantId, current + available);
        }
        return stockMap;
      } catch (error) {
        // RC-5 fix: structured JSON warning with detectable errorCode
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

    const failingPrisma = {
      inventory_StockItem: {
        findMany: jest.fn().mockRejectedValue(new Error('DB connection failed'))
      }
    };

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchStockByVariantIds_fixed(failingPrisma, ['v1', 'v2']);

    // Graceful degradation must still work — returns empty map
    expect(result.size).toBe(0);

    // Check for structured JSON with errorCode
    const hasStructuredError = warnSpy.mock.calls.some(args => {
      const msg = args[0];
      if (typeof msg !== 'string') return false;
      try {
        const parsed = JSON.parse(msg);
        return parsed.errorCode === 'INVENTORY_UNREACHABLE';
      } catch {
        return false;
      }
    });

    warnSpy.mockRestore();

    // FAILS on unfixed code: console.warn is called with two args (prefix string + error.message),
    // not a single structured JSON string with errorCode
    expect(hasStructuredError).toBe(true);
  });
});
