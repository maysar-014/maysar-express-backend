const mockPrisma = {
  order_Order: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn()
  },
  support_Ticket: {
    findMany: jest.fn()
  },
  analytics_SellerInventoryHealth: {
    groupBy: jest.fn()
  },
  analytics_SellerMetrics: {
    upsert: jest.fn()
  }
};

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { CalculateProfitabilityScore } from './CalculateProfitabilityScore';

describe('CalculateProfitabilityScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds score breakdown from growth, repeat buyers, response time, completion, and inventory stability', async () => {
    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 1500 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } });
    mockPrisma.order_Order.groupBy.mockResolvedValue([
      { buyerId: 'b1', _count: { id: 2 } },
      { buyerId: 'b2', _count: { id: 1 } }
    ]);
    mockPrisma.support_Ticket.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-08T08:00:00.000Z'), resolvedAt: new Date('2026-03-08T09:00:00.000Z') }
    ]);
    mockPrisma.order_Order.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);
    mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
      { stockStatus: 'IN_STOCK', _count: { id: 8 } },
      { stockStatus: 'LOW_STOCK', _count: { id: 2 } }
    ]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue(undefined);

    const useCase = new CalculateProfitabilityScore();
    const breakdown = await useCase.execute('seller-1');

    expect(breakdown.salesGrowth).toBeGreaterThan(0);
    expect(breakdown.repeatBuyers).toBeCloseTo(10, 2); // 50% * 20
    expect(breakdown.responseTime).toBe(10); // 1h falls in <24h tier
    expect(breakdown.orderCompletion).toBe(16); // 8/10 * 20
    expect(breakdown.inventoryStability).toBe(12); // 8/10 * 15
    expect(breakdown.total).toBeGreaterThan(0);
    expect(mockPrisma.analytics_SellerMetrics.upsert).toHaveBeenCalledWith({
      where: { sellerId: 'seller-1' },
      update: { profitabilityScore: breakdown.total },
      create: { sellerId: 'seller-1', profitabilityScore: breakdown.total }
    });
  });

  it('handles empty support tickets and zero monthly baseline safely', async () => {
    mockPrisma.order_Order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 } });
    mockPrisma.order_Order.groupBy.mockResolvedValue([]);
    mockPrisma.support_Ticket.findMany.mockResolvedValue([]);
    mockPrisma.order_Order.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue(undefined);

    const useCase = new CalculateProfitabilityScore();
    const breakdown = await useCase.execute('seller-2');

    expect(breakdown.responseTime).toBe(15);
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
  });
});

