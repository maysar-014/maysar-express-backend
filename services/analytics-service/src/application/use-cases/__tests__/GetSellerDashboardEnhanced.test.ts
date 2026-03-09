const mockScoreExecute = jest.fn();

const mockPrisma = {
  order_Order: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn()
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
    findMany: jest.fn()
  },
  analytics_SellerProductPerformance: {
    findFirst: jest.fn()
  },
  product: {
    findUnique: jest.fn()
  },
  analytics_SellerActionItem: {
    findMany: jest.fn()
  },
  analytics_SellerInventoryHealth: {
    groupBy: jest.fn()
  }
};

jest.mock('../../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

jest.mock('../CalculateProfitabilityScore', () => ({
  CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({
    execute: mockScoreExecute
  }))
}));

import { GetSellerDashboardEnhanced } from '../GetSellerDashboardEnhanced';

function seedPrisma({
  todaySales = 100,
  thisMonthSales = 1000,
  lastMonthSales = 500,
  scoreTotal = 85,
  salesTrend = [120, 140, 160]
}: {
  todaySales?: number;
  thisMonthSales?: number;
  lastMonthSales?: number;
  scoreTotal?: number;
  salesTrend?: number[];
} = {}): void {
  mockPrisma.order_Order.aggregate
    .mockResolvedValueOnce({ _sum: { totalAmount: todaySales }, _count: { id: 2 } })
    .mockResolvedValueOnce({ _sum: { totalAmount: thisMonthSales } })
    .mockResolvedValueOnce({ _sum: { totalAmount: lastMonthSales } });

  mockPrisma.wallet_Wallet.findFirst.mockResolvedValue({ balance: 400, frozenAmount: 20 });
  mockPrisma.payout.findFirst.mockResolvedValue({ createdAt: new Date('2026-01-25T00:00:00.000Z') });
  mockPrisma.commission.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

  mockPrisma.analytics_SellerDailySales.findMany.mockResolvedValue(
    salesTrend.map((revenue, index) => ({
      date: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      revenue
    }))
  );

  mockPrisma.order_Order.groupBy
    .mockResolvedValueOnce([
      { buyerId: 'b1', _count: { id: 2 } },
      { buyerId: 'b2', _count: { id: 1 } }
    ])
    .mockResolvedValueOnce([
      { status: 'PENDING', _count: { id: 1 } },
      { status: 'CONFIRMED', _count: { id: 2 } },
      { status: 'IN_TRANSIT', _count: { id: 3 } },
      { status: 'DELIVERED', _count: { id: 4 } },
      { status: 'CANCELLED', _count: { id: 1 } }
    ]);

  mockPrisma.analytics_SellerProductPerformance.findFirst.mockResolvedValue({
    productId: 'prod-1',
    orders: 9,
    revenue: 999
  });
  mockPrisma.product.findUnique.mockResolvedValue({ title: 'Top Product' });
  mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue([{ id: 'action-1' }]);
  mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
    { stockStatus: 'IN_STOCK', _count: { id: 10 } },
    { stockStatus: 'LOW_STOCK', _count: { id: 2 } },
    { stockStatus: 'OUT_OF_STOCK', _count: { id: 1 } }
  ]);
  mockPrisma.order_Order.findMany.mockResolvedValue([
    {
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T16:00:00.000Z')
    }
  ]);

  mockScoreExecute.mockResolvedValue({
    salesGrowth: 22.4,
    repeatBuyers: 10.1,
    responseTime: 12.6,
    orderCompletion: 16.8,
    inventoryStability: 14.2,
    total: scoreTotal
  });
}

describe('GetSellerDashboardEnhanced', () => {
  const sellerId = 'seller-1';
  let useCase: GetSellerDashboardEnhanced;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetSellerDashboardEnhanced();
  });

  it('returns a full dashboard response with expected derived fields', async () => {
    seedPrisma({ scoreTotal: 85 });

    const result = await useCase.execute(sellerId);

    expect(result.moneySnapshot.todaySales.amount).toBe(100);
    expect(result.moneySnapshot.thisMonthRevenue.growth).toBe(100);
    expect(result.moneySnapshot.netPayout).toBe(900);
    expect(result.performanceInsights.salesTrend.trend).toBe('up');
    expect(result.performanceInsights.bestProduct.name).toBe('Top Product');
    expect(result.orders).toEqual({
      new: 1,
      processing: 2,
      shipped: 3,
      completed: 4,
      disputed: 1
    });
    expect(result.inventoryHealth).toEqual({
      inStock: 10,
      lowStock: 2,
      outOfStock: 1,
      alerts: []
    });
    expect(result.profitabilityScore).toEqual({
      score: 85,
      status: 'Excellent',
      breakdown: {
        salesGrowth: 22,
        repeatBuyers: 10,
        responseTime: 13,
        orderCompletion: 17,
        inventoryStability: 14
      }
    });
  });

  it.each([
    { score: 65, expected: 'Good' },
    { score: 50, expected: 'Fair' },
    { score: 30, expected: 'Needs Improvement' }
  ])('maps score $score to status $expected', async ({ score, expected }) => {
    seedPrisma({ scoreTotal: score, salesTrend: [100] });

    const result = await useCase.execute(sellerId);
    expect(result.profitabilityScore.status).toBe(expected);
    expect(result.performanceInsights.salesTrend.trend).toBe('flat');
  });

  it('handles downward trend and zero-previous growth branch', async () => {
    seedPrisma({
      todaySales: 0,
      thisMonthSales: 200,
      lastMonthSales: 0,
      salesTrend: [200, 150, 100]
    });

    const result = await useCase.execute(sellerId);
    expect(result.moneySnapshot.thisMonthRevenue.growth).toBe(100);
    expect(result.performanceInsights.salesTrend.trend).toBe('down');
  });
});
