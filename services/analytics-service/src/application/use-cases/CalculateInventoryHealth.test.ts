const mockPrisma = {
  product: {
    findMany: jest.fn()
  },
  inventory_StockItem: {
    findMany: jest.fn()
  },
  order_OrderItem: {
    aggregate: jest.fn()
  },
  analytics_SellerInventoryHealth: {
    upsert: jest.fn(),
    groupBy: jest.fn()
  }
};

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { CalculateInventoryHealth } from './CalculateInventoryHealth';

describe('CalculateInventoryHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates stock status per product, persists health, and returns summary counts', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    mockPrisma.inventory_StockItem.findMany
      .mockResolvedValueOnce([{ quantityAvailable: 30 }])
      .mockResolvedValueOnce([{ quantityAvailable: 0 }]);
    mockPrisma.order_OrderItem.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 60 } }) // 2/day, 15 days left -> LOW_STOCK
      .mockResolvedValueOnce({ _sum: { quantity: 0 } }); // no sales, but 0 stock -> OUT_OF_STOCK
    mockPrisma.analytics_SellerInventoryHealth.upsert.mockResolvedValue(undefined);
    mockPrisma.analytics_SellerInventoryHealth.groupBy.mockResolvedValue([
      { stockStatus: 'IN_STOCK', _count: { id: 1 } },
      { stockStatus: 'LOW_STOCK', _count: { id: 1 } },
      { stockStatus: 'OUT_OF_STOCK', _count: { id: 2 } }
    ]);

    const useCase = new CalculateInventoryHealth();
    const result = await useCase.execute('seller-1');

    expect(mockPrisma.analytics_SellerInventoryHealth.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.analytics_SellerInventoryHealth.groupBy).toHaveBeenCalledWith({
      by: ['stockStatus'],
      where: { sellerId: 'seller-1' },
      _count: { id: true }
    });
    expect(result).toEqual({
      inStock: 1,
      lowStock: 1,
      outOfStock: 2
    });
  });
});

