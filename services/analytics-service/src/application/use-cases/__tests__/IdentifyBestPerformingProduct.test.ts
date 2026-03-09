const mockPrisma = {
  order_OrderItem: {
    groupBy: jest.fn(),
    aggregate: jest.fn()
  },
  product: {
    findUnique: jest.fn()
  },
  analytics_SellerProductPerformance: {
    upsert: jest.fn()
  },
  analytics_SellerMetrics: {
    upsert: jest.fn()
  }
};

jest.mock('../../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { IdentifyBestPerformingProduct } from '../IdentifyBestPerformingProduct';

describe('IdentifyBestPerformingProduct', () => {
  const sellerId = 'seller-1';
  let useCase: IdentifyBestPerformingProduct;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new IdentifyBestPerformingProduct();
  });

  it('returns null when no delivered order items exist', async () => {
    mockPrisma.order_OrderItem.groupBy.mockResolvedValue([]);
    const result = await useCase.execute(sellerId);

    expect(result).toBeNull();
    expect(mockPrisma.order_OrderItem.aggregate).not.toHaveBeenCalled();
  });

  it('returns best product summary and persists performance metrics', async () => {
    mockPrisma.order_OrderItem.groupBy.mockResolvedValue([
      { productId: 'prod-1', _sum: { quantity: 10 } }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({
      _sum: { quantity: 10 },
      _avg: { price: 100 }
    });
    mockPrisma.product.findUnique.mockResolvedValue({ title: 'Top Product' });
    mockPrisma.analytics_SellerProductPerformance.upsert.mockResolvedValue(undefined);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue(undefined);

    const result = await useCase.execute(sellerId);

    expect(mockPrisma.order_OrderItem.groupBy).toHaveBeenCalledWith({
      by: ['productId'],
      where: { order: { sellerId, status: 'DELIVERED' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1
    });
    expect(mockPrisma.order_OrderItem.aggregate).toHaveBeenCalledWith({
      where: { productId: 'prod-1', order: { sellerId, status: 'DELIVERED' } },
      _sum: { quantity: true },
      _avg: { price: true }
    });
    expect(mockPrisma.analytics_SellerProductPerformance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId_productId: { sellerId, productId: 'prod-1' } },
        update: { orders: 10, revenue: 1000 },
        create: { sellerId, productId: 'prod-1', orders: 10, revenue: 1000 }
      })
    );
    expect(mockPrisma.analytics_SellerMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId },
        update: {
          bestPerformingProductId: 'prod-1',
          bestPerformingProductRevenue: 1000,
          bestPerformingProductUnitsSold: 10
        }
      })
    );
    expect(result).toEqual({
      productId: 'prod-1',
      productName: 'Top Product',
      revenue: 1000,
      unitsSold: 10
    });
  });

  it('falls back to Unknown product name when lookup misses', async () => {
    mockPrisma.order_OrderItem.groupBy.mockResolvedValue([
      { productId: 'prod-1', _sum: { quantity: 2 } }
    ]);
    mockPrisma.order_OrderItem.aggregate.mockResolvedValue({
      _sum: { quantity: 2 },
      _avg: { price: 25 }
    });
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.analytics_SellerProductPerformance.upsert.mockResolvedValue(undefined);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue(undefined);

    const result = await useCase.execute(sellerId);
    expect(result?.productName).toBe('Unknown');
    expect(result?.revenue).toBe(50);
  });
});
