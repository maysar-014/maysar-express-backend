import { IdentifyBestPerformingProduct } from '../IdentifyBestPerformingProduct';
import prisma from '../../../infrastructure/database/prisma';

describe('IdentifyBestPerformingProduct', () => {
  const useCase = new IdentifyBestPerformingProduct();
  const sellerId = 'test-seller-123';
  const productId = 'test-product-456';

  beforeEach(async () => {
    // Clean up test data
    await prisma.analytics_SellerProductPerformance.deleteMany({
      where: { sellerId }
    });
    await prisma.analytics_SellerMetrics.deleteMany({
      where: { sellerId }
    });
  });

  it('should return null when no orders exist', async () => {
    const result = await useCase.execute(sellerId);
    expect(result).toBeNull();
  });

  it('should identify best product when orders exist', async () => {
    // Create test product
    await prisma.catalog_Product.create({
      data: {
        id: productId,
        sellerId,
        title: 'Best Selling Product',
        categoryId: 'test-category',
        status: 'published'
      }
    });

    // Create test orders with items
    const order = await prisma.order_Order.create({
      data: {
        id: 'test-order-1',
        buyerId: 'test-buyer',
        sellerId,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        totalAmount: 1000,
        totalWeight: 5,
        deliveryAddress: {}
      }
    });

    await prisma.order_OrderItem.create({
      data: {
        id: 'test-item-1',
        orderId: order.id,
        productId,
        quantity: 10,
        price: 100,
        weight: 5
      }
    });

    const result = await useCase.execute(sellerId);

    expect(result).not.toBeNull();
    expect(result?.productId).toBe(productId);
    expect(result?.productName).toBe('Best Selling Product');
    expect(result?.unitsSold).toBe(10);
    expect(result?.revenue).toBe(1000); // 10 * 100
  });

  it('should populate Analytics_SellerProductPerformance', async () => {
    await prisma.catalog_Product.create({
      data: {
        id: productId,
        sellerId,
        title: 'Test Product',
        categoryId: 'test-category',
        status: 'published'
      }
    });

    const order = await prisma.order_Order.create({
      data: {
        id: 'test-order-2',
        buyerId: 'test-buyer',
        sellerId,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        totalAmount: 500,
        totalWeight: 2,
        deliveryAddress: {}
      }
    });

    await prisma.order_OrderItem.create({
      data: {
        id: 'test-item-2',
        orderId: order.id,
        productId,
        quantity: 5,
        price: 100,
        weight: 2
      }
    });

    await useCase.execute(sellerId);

    const performance = await prisma.analytics_SellerProductPerformance.findFirst({
      where: { sellerId, productId }
    });

    expect(performance).not.toBeNull();
    expect(performance?.orders).toBe(5);
    expect(performance?.revenue).toBe(500);
  });

  it('should update Analytics_SellerMetrics with best product', async () => {
    await prisma.catalog_Product.create({
      data: {
        id: productId,
        sellerId,
        title: 'Top Product',
        categoryId: 'test-category',
        status: 'published'
      }
    });

    const order = await prisma.order_Order.create({
      data: {
        id: 'test-order-3',
        buyerId: 'test-buyer',
        sellerId,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        totalAmount: 2000,
        totalWeight: 10,
        deliveryAddress: {}
      }
    });

    await prisma.order_OrderItem.create({
      data: {
        id: 'test-item-3',
        orderId: order.id,
        productId,
        quantity: 20,
        price: 100,
        weight: 10
      }
    });

    await useCase.execute(sellerId);

    const metrics = await prisma.analytics_SellerMetrics.findFirst({
      where: { sellerId }
    });

    expect(metrics?.bestPerformingProductId).toBe(productId);
    expect(metrics?.bestPerformingProductUnitsSold).toBe(20);
    expect(metrics?.bestPerformingProductRevenue).toBe(2000);
  });
});
