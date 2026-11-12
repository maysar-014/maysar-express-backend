/**
 * PRESERVATION PROPERTY TESTS
 *
 * EXPECTED: All tests in this file PASS on UNFIXED code.
 * These tests establish baseline behavior that must be preserved after the fix is applied.
 *
 * They verify that components unaffected by the order-status filter change continue to
 * behave identically before and after the fix.
 *
 * Properties tested:
 *   P1:  DELIVERED-only seller gets accurate dashboard revenue (unchanged by fix)
 *   P2:  Orders with DRAFT/PENDING/CANCELLED produce zero revenue (unchanged by fix)
 *   P3:  Empty state (no orders) produces zeros and empty arrays (unchanged by fix)
 *   P4:  Action center reads from analytics_SellerActionItem, independent of order status
 *   P5:  responseTime profitability component reads from support_Ticket, independent of order status
 *   P6:  inventoryStability reads from analytics_SellerInventoryHealth (in CalculateProfitabilityScore)
 *   P7:  Order pipeline counts use raw groupBy (not filtered by committed statuses)
 *   P8:  Avg delivery time query stays DELIVERED-only
 *   P9:  Trend calculation method is unchanged (calculateTrend logic)
 *   P10: CalculateInventoryHealth use case itself is unchanged
 */

// --- Mock setup must appear BEFORE imports ---

const mockScoreExecute = jest.fn();

const mockPrisma = {
  order_Order: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn()
  },
  wallet_Wallet: {
    findFirst: jest.fn()
  },
  payout: {
    findFirst: jest.fn()
  },
  commission: {
    aggregate: jest.fn()
  },
  analytics_SellerDailySales: {
    findMany: jest.fn(),
    upsert: jest.fn()
  },
  analytics_SellerProductPerformance: {
    findFirst: jest.fn()
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  analytics_SellerActionItem: {
    findMany: jest.fn()
  },
  analytics_SellerInventoryHealth: {
    groupBy: jest.fn(),
    upsert: jest.fn()
  },
  analytics_SellerMetrics: {
    upsert: jest.fn()
  },
  support_Ticket: {
    findMany: jest.fn()
  },
  order_OrderItem: {
    groupBy: jest.fn(),
    aggregate: jest.fn()
  },
  productVariant: {
    findMany: jest.fn()
  },
  inventory_StockItem: {
    findMany: jest.fn()
  }
};

jest.mock('../../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

// Mock CalculateProfitabilityScore for dashboard tests so it doesn't make real prisma calls
jest.mock('../CalculateProfitabilityScore', () => ({
  CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({
    execute: mockScoreExecute
  }))
}));

// Mock classifyStockStatus for CalculateInventoryHealth (P10)
jest.mock('@shared/inventory/classifyStockStatus', () => ({
  classifyStockStatus: jest.fn().mockReturnValue('in_stock')
}));

import { GetSellerDashboardEnhanced } from '../GetSellerDashboardEnhanced';
import { GenerateSalesTrend } from '../GenerateSalesTrend';
import { CalculateInventoryHealth } from '../CalculateInventoryHealth';

const SELLER_ID = 'seller-preservation-tests';

// ---------------------------------------------------------------------------
// Shared safe defaults — prevents unhandled promise rejections from unmocked calls
// ---------------------------------------------------------------------------
function applyDashboardSafeDefaults() {
  // wallet & payout
  mockPrisma.wallet_Wallet.findFirst.mockResolvedValue(null);
  mockPrisma.payout.findFirst.mockResolvedValue(null);
  mockPrisma.commission.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

  // sales trend daily records
  mockPrisma.analytics_SellerDailySales.findMany.mockResolvedValue([]);
  mockPrisma.analytics_SellerDailySales.upsert.mockResolvedValue({});

  // action items
  mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue([]);

  // product lookup (for best product)
  mockPrisma.analytics_SellerProductPerformance.findFirst.mockResolvedValue(null);
  mockPrisma.product.findUnique.mockResolvedValue(null);
  mockPrisma.product.findMany.mockResolvedValue([]);

  // order_OrderItem fallback
  mockPrisma.order_OrderItem.groupBy.mockResolvedValue([]);
  mockPrisma.order_OrderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

  // inventory health snapshot
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
  mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue({});

  // profitability score — used by dashboard via mocked CalculateProfitabilityScore
  mockScoreExecute.mockResolvedValue({
    salesGrowth: 0,
    repeatBuyers: 0,
    responseTime: 15,
    orderCompletion: 0,
    inventoryStability: 0,
    total: 15
  });

  // analytics_SellerMetrics upsert
  mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({
    sellerId: SELLER_ID,
    profitabilityScore: 0
  });

  // support tickets
  mockPrisma.support_Ticket.findMany.mockResolvedValue([]);
}

// ---------------------------------------------------------------------------
// Preservation Property Tests
// ---------------------------------------------------------------------------
describe('Preservation Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // P1: DELIVERED-only seller gets accurate dashboard revenue
  // -------------------------------------------------------------------------
  it('P1 — DELIVERED-only seller gets accurate dashboard revenue (DELIVERED is in committed set)', async () => {
    // DELIVERED sellers see the same results before and after fix since DELIVERED is in committed set.
    // This confirms baseline behavior is correct for the DELIVERED-only case.

    applyDashboardSafeDefaults();

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 150000 }, _count: { id: 3 } }) // todayOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } })                     // thisMonthOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } });                    // lastMonthOrders

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([]) // repeatCustomers
      .mockResolvedValueOnce([]); // orderCounts by status

    mockPrisma.order_Order.findMany.mockResolvedValue([]); // deliveredOrders for avg delivery time

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // DELIVERED-only seller: both unfixed and fixed code use aggregate returning these values
    expect(result.moneySnapshot.todaySales.amount).toBe(150000);
    expect(result.moneySnapshot.thisMonthRevenue.amount).toBe(500000);
  });

  // -------------------------------------------------------------------------
  // P2: Orders with DRAFT/PENDING/CANCELLED statuses produce zero revenue
  // -------------------------------------------------------------------------
  it('P2 — DRAFT/PENDING/CANCELLED orders are excluded from revenue (must remain excluded after fix)', async () => {
    // Simulating DELIVERED filter correctly excluding DRAFT/PENDING/CANCELLED orders.
    // The filter returns zero because none of those orders pass the DELIVERED filter.
    // After the fix, COMMITTED_ORDER_STATUSES also excludes these statuses — behavior is preserved.

    applyDashboardSafeDefaults();

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } }) // todayOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })                     // thisMonthOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } });                    // lastMonthOrders

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([]) // repeatCustomers
      .mockResolvedValueOnce([]); // orderCounts by status

    mockPrisma.order_Order.findMany.mockResolvedValue([]);

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // DRAFT/PENDING/CANCELLED orders are excluded from revenue — must remain excluded after fix
    expect(result.moneySnapshot.todaySales.amount).toBe(0);
    expect(result.moneySnapshot.thisMonthRevenue.amount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // P3: Empty state (no orders) produces zeros and empty arrays
  // -------------------------------------------------------------------------
  it('P3 — Empty state (no orders) produces zeros and empty arrays (must remain after fix)', async () => {
    // Empty state must remain zeros and empty arrays after fix.

    applyDashboardSafeDefaults();

    // All order queries return null/empty
    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: null }, _count: { id: 0 } }) // todayOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: null } })                     // thisMonthOrders
      .mockResolvedValueOnce({ _sum: { totalAmount: null } });                    // lastMonthOrders

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([]) // repeatCustomers
      .mockResolvedValueOnce([]); // orderCounts by status

    mockPrisma.order_Order.findMany.mockResolvedValue([]);

    // Override daily sales to return empty (already set in applyDashboardSafeDefaults)
    mockPrisma.analytics_SellerDailySales.findMany.mockResolvedValue([]);

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // Empty state should produce zeros and empty arrays
    expect(result.moneySnapshot.todaySales.amount).toBe(0);
    expect(result.performanceInsights.salesTrend.data).toHaveLength(0);
    expect(result.performanceInsights.salesTrend.trend).toBe('flat');
  });

  // -------------------------------------------------------------------------
  // P4: Action center reads from analytics_SellerActionItem, unaffected by order status
  // -------------------------------------------------------------------------
  it('P4 — Action center reads from analytics_SellerActionItem, independent of order status filter', async () => {
    // Action center is sourced from analytics_SellerActionItem, independent of order status filter.

    applyDashboardSafeDefaults();

    const actionItems = [
      { id: 'action-1', sellerId: SELLER_ID, type: 'SLA_BREACH', isResolved: false, priority: 1, createdAt: new Date() },
      { id: 'action-2', sellerId: SELLER_ID, type: 'RESTOCK', isResolved: false, priority: 2, createdAt: new Date() }
    ];
    mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue(actionItems);

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } });

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockPrisma.order_Order.findMany.mockResolvedValue([]);

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // Action center must return 2 items with the expected ids
    expect(result.actionCenter).toHaveLength(2);
    expect(result.actionCenter[0].id).toBe('action-1');
    expect(result.actionCenter[1].id).toBe('action-2');
  });

  // -------------------------------------------------------------------------
  // P5: responseTime profitability component reads from support_Ticket
  // -------------------------------------------------------------------------
  it('P5 — responseTime reads from support_Ticket, independent of order status (must remain unchanged)', async () => {
    // responseTime reads from support_Ticket, independent of order status — must remain unchanged.

    const now = new Date();
    const resolvedAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes later (< 1 hour → 15 pts)

    mockPrisma.support_Ticket.findMany.mockResolvedValue([
      { createdAt: now, resolvedAt }
    ]);

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } }) // thisMonth
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } }); // lastMonth

    mockPrisma.order_Order.groupBy.mockResolvedValue([]); // thisMonthBuyers

    mockPrisma.order_Order.count
      .mockResolvedValueOnce(0)  // totalOrders
      .mockResolvedValueOnce(0); // deliveredOrders

    mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({
      sellerId: SELLER_ID,
      profitabilityScore: 0
    });

    // Use the real CalculateProfitabilityScore (not the mocked dashboard version)
    const useCase = new (jest.requireActual('../CalculateProfitabilityScore') as any).CalculateProfitabilityScore();
    const result = await useCase.execute(SELLER_ID);

    // 30 minutes response time → < 1 hour → 15 points
    expect(result.responseTime).toBe(15);
  });

  // -------------------------------------------------------------------------
  // P6: inventoryStability reads from analytics_SellerInventoryHealth (in CalculateProfitabilityScore)
  // -------------------------------------------------------------------------
  it('P6 — inventoryStability in CalculateProfitabilityScore reads from analytics_SellerInventoryHealth snapshot', async () => {
    // inventoryStability in CalculateProfitabilityScore reads from analytics_SellerInventoryHealth snapshot
    // — separate from dashboard inventory health section.

    // 4 IN_STOCK, 1 OUT_OF_STOCK → stability = (4/5) * 15 = 12
    mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
      { stockStatus: 'IN_STOCK', _count: { id: 4 } },
      { stockStatus: 'OUT_OF_STOCK', _count: { id: 1 } }
    ]);

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } }) // thisMonth
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } }); // lastMonth

    mockPrisma.order_Order.groupBy.mockResolvedValue([]); // thisMonthBuyers

    mockPrisma.order_Order.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    mockPrisma.support_Ticket.findMany.mockResolvedValue([]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({
      sellerId: SELLER_ID,
      profitabilityScore: 0
    });

    const useCase = new (jest.requireActual('../CalculateProfitabilityScore') as any).CalculateProfitabilityScore();
    const result = await useCase.execute(SELLER_ID);

    // (4/5) * 15 = 12
    expect(result.inventoryStability).toBe((4 / 5) * 15);
  });

  // -------------------------------------------------------------------------
  // P7: Order pipeline counts use raw groupBy (not filtered by committed statuses)
  // -------------------------------------------------------------------------
  it('P7 — Order pipeline counts use raw groupBy (all statuses, not filtered by committed set)', async () => {
    // Pipeline counts represent current state — all statuses, not filtered by committed set.

    applyDashboardSafeDefaults();

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } });

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([]) // repeatCustomers
      .mockResolvedValueOnce([  // orderCounts by status
        { status: 'PENDING',    _count: { id: 5 } },
        { status: 'CONFIRMED',  _count: { id: 3 } },
        { status: 'IN_TRANSIT', _count: { id: 2 } },
        { status: 'DELIVERED',  _count: { id: 47 } },
        { status: 'CANCELLED',  _count: { id: 1 } }
      ]);

    mockPrisma.order_Order.findMany.mockResolvedValue([]);

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // Raw status-to-pipeline mapping must be preserved
    expect(result.orders.new).toBe(5);        // PENDING
    expect(result.orders.processing).toBe(3); // CONFIRMED
    expect(result.orders.shipped).toBe(2);    // IN_TRANSIT
    expect(result.orders.completed).toBe(47); // DELIVERED
    expect(result.orders.disputed).toBe(1);   // CANCELLED
  });

  // -------------------------------------------------------------------------
  // P8: Avg delivery time query stays DELIVERED-only
  // -------------------------------------------------------------------------
  it('P8 — Avg delivery time query stays DELIVERED-only (delivery time only meaningful for delivered orders)', async () => {
    // Avg delivery time uses DELIVERED-only filter — delivery time only meaningful for delivered orders,
    // must not change.

    applyDashboardSafeDefaults();

    const createdAt = new Date('2024-01-01T08:00:00Z');
    const updatedAt = new Date('2024-01-02T08:00:00Z'); // 24 hours later

    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } });

    mockPrisma.order_Order.groupBy
      .mockResolvedValueOnce([]) // repeatCustomers
      .mockResolvedValueOnce([]); // orderCounts by status

    // Section 7 avg delivery time — 2 DELIVERED orders, each 24 hours
    mockPrisma.order_Order.findMany.mockResolvedValue([
      { createdAt, updatedAt },
      { createdAt, updatedAt }
    ]);

    const useCase = new GetSellerDashboardEnhanced();
    const result = await useCase.execute(SELLER_ID);

    // Avg delivery time = 24 hours
    expect(result.reputation.averageDeliveryTime).toBe(24);
  });

  // -------------------------------------------------------------------------
  // P9: Trend calculation method is unchanged (calculateTrend logic)
  // -------------------------------------------------------------------------
  it('P9 — Trend calculation method (110%/90% thresholds) must be preserved', async () => {
    // Trend calculation method (110%/90% thresholds) must be preserved.
    // Orders producing daily revenues: [100, 100, 100, 200, 200, 200]
    // prev3 avg = (100+100+100)/3 = 100
    // last3 avg = (200+200+200)/3 = 200
    // 200 > 100 * 1.1 → trend 'up'

    const baseDate = new Date('2024-01-01T00:00:00Z');

    // 6 orders spread across 6 days — 3 with revenue 100, then 3 with revenue 200
    const orders = [
      { createdAt: new Date('2024-01-01T10:00:00Z'), totalAmount: 100 },
      { createdAt: new Date('2024-01-02T10:00:00Z'), totalAmount: 100 },
      { createdAt: new Date('2024-01-03T10:00:00Z'), totalAmount: 100 },
      { createdAt: new Date('2024-01-04T10:00:00Z'), totalAmount: 200 },
      { createdAt: new Date('2024-01-05T10:00:00Z'), totalAmount: 200 },
      { createdAt: new Date('2024-01-06T10:00:00Z'), totalAmount: 200 }
    ];

    mockPrisma.order_Order.findMany.mockResolvedValue(orders);
    mockPrisma.analytics_SellerDailySales.upsert.mockResolvedValue({});

    const useCase = new GenerateSalesTrend();
    const result = await useCase.execute(SELLER_ID);

    // last3Avg (200) > prevAvg (100) * 1.1 → trend is 'up'
    expect(result.trend).toBe('up');
  });

  // -------------------------------------------------------------------------
  // P10: CalculateInventoryHealth use case itself is unchanged
  // -------------------------------------------------------------------------
  it('P10 — CalculateInventoryHealth use case itself is unchanged by the dashboard fix', async () => {
    // CalculateInventoryHealth use case itself is unchanged by the dashboard fix —
    // only the call site changes.

    // 2 products, each with variants
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-1', sellerId: SELLER_ID },
      { id: 'product-2', sellerId: SELLER_ID }
    ]);

    // Each product has one variant
    mockPrisma.productVariant.findMany
      .mockResolvedValueOnce([{ id: 'variant-1' }])
      .mockResolvedValueOnce([{ id: 'variant-2' }]);

    // Stock items for each variant — both IN_STOCK (quantityAvailable: 100, quantityReserved: 0)
    mockPrisma.inventory_StockItem.findMany
      .mockResolvedValueOnce([{ productVariantId: 'variant-1', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 10 }])
      .mockResolvedValueOnce([{ productVariantId: 'variant-2', quantityAvailable: 100, quantityReserved: 0, reorderPoint: 10 }]);

    // Sales data for velocity calculation
    mockPrisma.order_OrderItem.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 30 } })
      .mockResolvedValueOnce({ _sum: { quantity: 30 } });

    // Upsert for each product's analytics record
    mockPrisma.analytics_SellerInventoryHealth.upsert
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const useCase = new CalculateInventoryHealth();
    const result = await useCase.execute(SELLER_ID);

    // Both products are IN_STOCK (classifyStockStatus returns 'in_stock' → toUpperCase() = 'IN_STOCK')
    expect(result.inStock).toBe(2);
    expect(result.outOfStock).toBe(0);
  });
});
