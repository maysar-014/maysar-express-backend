const mockPrisma = {
  order_Order: {
    findMany: jest.fn()
  },
  analytics_SellerDailySales: {
    upsert: jest.fn()
  }
};

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { GenerateSalesTrend } from './GenerateSalesTrend';

describe('GenerateSalesTrend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates daily sales, persists them, and reports upward trend', async () => {
    mockPrisma.order_Order.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-06T10:00:00.000Z'), totalAmount: 100 },
      { createdAt: new Date('2026-03-07T10:00:00.000Z'), totalAmount: 200 },
      { createdAt: new Date('2026-03-08T10:00:00.000Z'), totalAmount: 300 },
      { createdAt: new Date('2026-03-09T10:00:00.000Z'), totalAmount: 350 }
    ]);
    mockPrisma.analytics_SellerDailySales.upsert.mockResolvedValue(undefined);

    const useCase = new GenerateSalesTrend();
    const result = await useCase.execute('seller-1');

    expect(mockPrisma.order_Order.findMany).toHaveBeenCalledWith({
      where: {
        sellerId: 'seller-1',
        createdAt: { gte: expect.any(Date) },
        status: 'DELIVERED'
      },
      select: { createdAt: true, totalAmount: true }
    });
    expect(mockPrisma.analytics_SellerDailySales.upsert).toHaveBeenCalledTimes(4);
    expect(result.data).toHaveLength(4);
    expect(result.trend).toBe('up');
  });

  it('returns flat trend when there is insufficient history', async () => {
    mockPrisma.order_Order.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-09T10:00:00.000Z'), totalAmount: 120 }
    ]);
    mockPrisma.analytics_SellerDailySales.upsert.mockResolvedValue(undefined);

    const useCase = new GenerateSalesTrend();
    const result = await useCase.execute('seller-2');

    expect(result.trend).toBe('flat');
  });
});

