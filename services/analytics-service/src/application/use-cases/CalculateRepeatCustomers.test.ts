const mockPrisma = {
  order_Order: {
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

import { CalculateRepeatCustomers } from './CalculateRepeatCustomers';

describe('CalculateRepeatCustomers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes repeat customer rate and upserts seller metrics', async () => {
    mockPrisma.order_Order.groupBy.mockResolvedValue([
      { buyerId: 'b1', _count: { id: 2 } },
      { buyerId: 'b2', _count: { id: 1 } },
      { buyerId: 'b3', _count: { id: 4 } }
    ]);

    const useCase = new CalculateRepeatCustomers();
    const result = await useCase.execute('seller-1');

    expect(mockPrisma.order_Order.groupBy).toHaveBeenCalledWith({
      by: ['buyerId'],
      where: {
        sellerId: 'seller-1',
        createdAt: { gte: expect.any(Date) }
      },
      _count: { id: true }
    });
    expect(mockPrisma.analytics_SellerMetrics.upsert).toHaveBeenCalledWith({
      where: { sellerId: 'seller-1' },
      update: { repeatCustomerRate: (2 / 3) * 100 },
      create: { sellerId: 'seller-1', repeatCustomerRate: (2 / 3) * 100 }
    });
    expect(result).toBeCloseTo(66.666, 2);
  });

  it('returns zero repeat rate when no buyers exist', async () => {
    mockPrisma.order_Order.groupBy.mockResolvedValue([]);

    const useCase = new CalculateRepeatCustomers();
    const result = await useCase.execute('seller-2');

    expect(result).toBe(0);
  });
});

