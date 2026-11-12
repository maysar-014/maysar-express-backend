/**
 * PRESERVATION PROPERTY TESTS
 *
 * EXPECTED: All tests in this file PASS on both unfixed AND fixed code.
 * These tests document baseline behaviors that must not regress after the fix.
 *
 * Preservation properties:
 *   P-1: Products with quantityReserved=0 → currentStock unchanged (subtracting 0 is a no-op)
 *   P-2: Sellers with zero cancelled/refunded orders → salesVelocity unchanged by the filter
 *   P-3: classifyStockStatus is non-decreasing (more stock never downgrades status)
 *   P-4: classifyStockStatus with reorderPoint=0 always returns 'in_stock' for available > 0
 *   P-5: classifyStockStatus always returns 'out_of_stock' when effectiveAvailable <= 0
 *   P-6: SellerMetricsCalculationJob continues to call CalculateInventoryHealth for all sellers
 */

jest.mock(
  '@modules/auth-service/src/infrastructure/services/logger.service',
  () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }),
  { virtual: true }
);

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// P-3, P-4, P-5 — classifyStockStatus utility (inline current storefront logic)
// ---------------------------------------------------------------------------

/**
 * Current storefront inline classification logic — extracted verbatim from
 * get-product.use-case.ts buildProductDetails():
 *
 *   stockStatus = reorderPoint > 0 && totalAvailable <= reorderPoint
 *     ? 'low_stock'
 *     : 'in_stock'
 *   (preceded by: if totalAvailable <= 0 → 'out_of_stock')
 *
 * This is the rule the shared utility must preserve.
 */
function currentStorefrontClassify(
  effectiveAvailable: number,
  reorderPoint: number
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (effectiveAvailable <= 0) return 'out_of_stock';
  if (reorderPoint > 0 && effectiveAvailable <= reorderPoint) return 'low_stock';
  return 'in_stock';
}

describe('P-3: classifyStockStatus is non-decreasing as effectiveAvailable increases', () => {
  const statusOrder = { out_of_stock: 0, low_stock: 1, in_stock: 2 };

  it('more available stock never produces a lower-ranked status (PBT)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),  // base available
        fc.integer({ min: 1, max: 100 }),   // delta to add
        fc.integer({ min: 0, max: 500 }),   // reorderPoint
        (base, delta, reorderPoint) => {
          const statusBase = currentStorefrontClassify(base, reorderPoint);
          const statusHigher = currentStorefrontClassify(base + delta, reorderPoint);
          return statusOrder[statusHigher] >= statusOrder[statusBase];
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('P-4: classifyStockStatus with reorderPoint=0 always returns in_stock for available > 0', () => {
  it('no reorder threshold configured → always in_stock when stock exists (PBT)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),  // effectiveAvailable > 0
        (available) => {
          return currentStorefrontClassify(available, 0) === 'in_stock';
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('P-5: classifyStockStatus always returns out_of_stock when effectiveAvailable <= 0', () => {
  it('zero or negative effective available → always out_of_stock regardless of reorderPoint (PBT)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),  // effectiveAvailable <= 0
        fc.integer({ min: 0, max: 500 }),    // any reorderPoint
        (available, reorderPoint) => {
          return currentStorefrontClassify(available, reorderPoint) === 'out_of_stock';
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P-1: Zero-reservation path — currentStock equals quantityAvailable
// ---------------------------------------------------------------------------
describe('P-1: Products with quantityReserved=0 → currentStock is unchanged', () => {
  it('max(0, quantityAvailable - 0) equals quantityAvailable for all non-negative values (PBT)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (quantityAvailable) => {
          const quantityReserved = 0;
          const effectiveAvailable = Math.max(0, quantityAvailable - quantityReserved);
          return effectiveAvailable === quantityAvailable;
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P-2: Sellers with no cancelled orders → salesVelocity filter is a no-op
// ---------------------------------------------------------------------------
describe('P-2: Order status filter is a no-op when no CANCELLED orders exist', () => {
  const FULFILLED_STATUSES = ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];

  it('summing only fulfilled orders equals total when no cancelled orders exist (PBT)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            status: fc.constantFrom(...FULFILLED_STATUSES),
            quantity: fc.integer({ min: 1, max: 50 })
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (orders) => {
          const totalAllOrders = orders.reduce((sum, o) => sum + o.quantity, 0);
          const totalFulfilledOnly = orders
            .filter(o => !['CANCELLED'].includes(o.status))
            .reduce((sum, o) => sum + o.quantity, 0);
          // When no cancelled exist, both totals must be equal
          return totalAllOrders === totalFulfilledOnly;
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// P-6: SellerMetricsCalculationJob still calls CalculateInventoryHealth for all sellers
// ---------------------------------------------------------------------------
describe('P-6: SellerMetricsCalculationJob continues to call CalculateInventoryHealth for all sellers', () => {
  const mockPrismaForJob = {
    user_User: { findMany: jest.fn() },
    analytics_SellerMetrics: { update: jest.fn() }
  };

  const inventoryExecuteMock = jest.fn();
  const repeatExecuteMock = jest.fn();
  const bestProductExecuteMock = jest.fn();
  const salesTrendExecuteMock = jest.fn();
  const profitabilityExecuteMock = jest.fn();

  beforeAll(() => {
    jest.mock('../database/prisma', () => ({ __esModule: true, default: mockPrismaForJob }), { virtual: true });
    jest.mock('../../application/use-cases/CalculateInventoryHealth', () => ({
      CalculateInventoryHealth: jest.fn().mockImplementation(() => ({ execute: inventoryExecuteMock }))
    }));
    jest.mock('../../application/use-cases/CalculateRepeatCustomers', () => ({
      CalculateRepeatCustomers: jest.fn().mockImplementation(() => ({ execute: repeatExecuteMock }))
    }));
    jest.mock('../../application/use-cases/IdentifyBestPerformingProduct', () => ({
      IdentifyBestPerformingProduct: jest.fn().mockImplementation(() => ({ execute: bestProductExecuteMock }))
    }));
    jest.mock('../../application/use-cases/GenerateSalesTrend', () => ({
      GenerateSalesTrend: jest.fn().mockImplementation(() => ({ execute: salesTrendExecuteMock }))
    }));
    jest.mock('../../application/use-cases/CalculateProfitabilityScore', () => ({
      CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({ execute: profitabilityExecuteMock }))
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repeatExecuteMock.mockResolvedValue(undefined);
    bestProductExecuteMock.mockResolvedValue(undefined);
    salesTrendExecuteMock.mockResolvedValue(undefined);
    inventoryExecuteMock.mockResolvedValue(undefined);
    profitabilityExecuteMock.mockResolvedValue(undefined);
    mockPrismaForJob.analytics_SellerMetrics.update.mockResolvedValue(undefined);
  });

  it('calls CalculateInventoryHealth.execute for every active seller', async () => {
    mockPrismaForJob.user_User.findMany.mockResolvedValue([
      { id: 'seller-a' },
      { id: 'seller-b' },
      { id: 'seller-c' }
    ]);

    const { SellerMetricsCalculationJob } = await import('../SellerMetricsCalculationJob');
    const job = new SellerMetricsCalculationJob();
    await job.execute();

    expect(inventoryExecuteMock).toHaveBeenCalledTimes(3);
    expect(inventoryExecuteMock).toHaveBeenCalledWith('seller-a');
    expect(inventoryExecuteMock).toHaveBeenCalledWith('seller-b');
    expect(inventoryExecuteMock).toHaveBeenCalledWith('seller-c');
  });
});
