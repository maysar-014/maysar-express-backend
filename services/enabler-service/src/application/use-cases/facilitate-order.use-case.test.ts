import { FacilitateOrderUseCase } from './facilitate-order.use-case';
import { OrderFacilitatedEvent } from '../../domain/events/enabler-events';

describe('FacilitateOrderUseCase', () => {
  const dto = {
    enablerId: 'enabler-1',
    listingId: 'listing-1',
    buyerId: 'buyer-1',
    quantity: 2,
    shippingAddressId: 'ship-1',
    billingAddressId: 'bill-1'
  };

  const setup = () => {
    const enablerRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'enabler-1',
        status: 'ACTIVE',
        calculateCommissionRate: jest.fn().mockReturnValue(0.1)
      })
    };
    const listingRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'listing-1',
        productId: 'product-1',
        sellerId: 'seller-1',
        customPrice: 750,
        toPlainObject: () => ({ status: 'ACTIVE' })
      })
    };
    const orderRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const inventoryService = {
      checkAvailability: jest.fn().mockResolvedValue(true),
      reserve: jest.fn().mockResolvedValue(undefined)
    };
    const orderService = {
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-101',
        totalAmount: 1500
      })
    };
    const eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    const useCase = new FacilitateOrderUseCase(
      enablerRepository as never,
      orderRepository as never,
      listingRepository as never,
      inventoryService as never,
      orderService as never,
      eventPublisher as never
    );

    return {
      useCase,
      enablerRepository,
      listingRepository,
      orderRepository,
      inventoryService,
      orderService,
      eventPublisher
    };
  };

  it('creates order, persists enabler order, and publishes event on success', async () => {
    const ctx = setup();

    const result = await ctx.useCase.execute(dto as never);

    expect(ctx.inventoryService.checkAvailability).toHaveBeenCalledWith('product-1', 2);
    expect(ctx.inventoryService.reserve).toHaveBeenCalledWith('product-1', 2);
    expect(ctx.orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId: 'buyer-1',
        items: [{ productId: 'product-1', quantity: 2, price: 750 }]
      })
    );
    expect(ctx.orderRepository.save).toHaveBeenCalledTimes(1);

    const publishedEvent = ctx.eventPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(OrderFacilitatedEvent);
    expect(publishedEvent.orderId).toBe('order-101');
    expect(publishedEvent.enablerId).toBe('enabler-1');
    expect(publishedEvent.amount).toBe(1500);

    expect(result).toEqual(
      expect.objectContaining({
        orderId: 'order-101',
        enablerId: 'enabler-1',
        status: 'PENDING',
        orderAmount: 1500,
        enablerCommission: 150
      })
    );
  });

  it('throws when enabler does not exist', async () => {
    const ctx = setup();
    ctx.enablerRepository.findById.mockResolvedValue(null);

    await expect(ctx.useCase.execute(dto as never)).rejects.toThrow('Enabler not found');
  });

  it('throws when listing does not exist', async () => {
    const ctx = setup();
    ctx.listingRepository.findById.mockResolvedValue(null);

    await expect(ctx.useCase.execute(dto as never)).rejects.toThrow('Product listing not found');
  });

  it('throws policy error when inventory is unavailable', async () => {
    const ctx = setup();
    ctx.inventoryService.checkAvailability.mockResolvedValue(false);

    await expect(ctx.useCase.execute(dto as never)).rejects.toThrow(
      'Cannot facilitate order: Product is out of stock'
    );

    expect(ctx.inventoryService.reserve).not.toHaveBeenCalled();
    expect(ctx.orderService.createOrder).not.toHaveBeenCalled();
    expect(ctx.orderRepository.save).not.toHaveBeenCalled();
  });
});
