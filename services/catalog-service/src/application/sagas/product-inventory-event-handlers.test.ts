import {
  ProductCreatedInventoryHandler,
  ProductInventoryUpdatedHandler,
  ProductInventoryVerificationFailedHandler,
  ProductInventoryVerifiedHandler,
  productCreatedInventoryHandler,
  productInventoryUpdatedHandler,
  productInventoryVerificationFailedHandler,
  productInventoryVerifiedHandler
} from './product-inventory-event-handlers';

describe('Product inventory event handlers', () => {
  const now = new Date('2026-03-09T00:00:00.000Z');

  const makeDependencies = () => {
    const productRepository = {
      findById: jest.fn()
    };
    const eventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    const idGenerator = {
      generate: jest.fn().mockReturnValue('evt-generated')
    };
    const dateTimeService = {
      now: jest.fn().mockReturnValue(now)
    };
    return { productRepository, eventPublisher, idGenerator, dateTimeService };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('handles ProductInventoryVerified and publishes SagaStepCompleted', async () => {
    const deps = makeDependencies();
    const handler = new ProductInventoryVerifiedHandler(
      deps.productRepository as never,
      deps.eventPublisher as never,
      deps.idGenerator as never,
      deps.dateTimeService as never
    );

    await handler.handle({
      eventId: 'e1',
      eventType: 'ProductInventoryVerified',
      aggregateId: 'product-1',
      version: 1,
      timestamp: now,
      payload: {
        productId: 'product-1',
        sagaId: 'saga-1',
        verified: true,
        availableStock: 12,
        reservedStock: 2,
        status: 'in_stock',
        verificationTimestamp: now
      }
    });

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SagaStepCompleted',
        aggregateId: 'saga-1',
        payload: expect.objectContaining({
          stepId: 'wait_inventory_verification',
          productId: 'product-1',
          inventoryStatus: 'in_stock'
        })
      })
    );
  });

  it('handles verification failure event and publishes SagaStepFailed', async () => {
    const deps = makeDependencies();
    const handler = new ProductInventoryVerificationFailedHandler(
      deps.eventPublisher as never,
      deps.idGenerator as never,
      deps.dateTimeService as never
    );

    await handler.handle({
      eventId: 'e2',
      eventType: 'ProductInventoryVerificationFailed',
      aggregateId: 'product-2',
      version: 1,
      timestamp: now,
      payload: {
        productId: 'product-2',
        sagaId: 'saga-2',
        reason: 'Timeout from inventory service',
        errorCode: 'INV_TIMEOUT',
        verificationTimestamp: now
      }
    });

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SagaStepFailed',
        aggregateId: 'saga-2',
        payload: expect.objectContaining({
          error: 'Inventory verification failed: Timeout from inventory service',
          errorCode: 'INV_TIMEOUT',
          productId: 'product-2'
        })
      })
    );
  });

  it('handles inventory updates and publishes out-of-stock event when stock reaches zero', async () => {
    const deps = makeDependencies();
    deps.productRepository.findById.mockResolvedValue({ id: 'product-3' });
    const handler = new ProductInventoryUpdatedHandler(
      deps.productRepository as never,
      deps.eventPublisher as never,
      deps.idGenerator as never,
      deps.dateTimeService as never
    );

    await handler.handle({
      eventId: 'e3',
      eventType: 'ProductInventoryUpdated',
      aggregateId: 'product-3',
      version: 1,
      timestamp: now,
      payload: {
        productId: 'product-3',
        previousStock: { available: 6, reserved: 1, total: 7 },
        newStock: { available: 0, reserved: 2, total: 2 },
        changeReason: 'warehouse adjustment',
        updatedBy: 'inventory-service',
        updateTimestamp: now
      }
    });

    expect(deps.eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: 'ProductInventoryStatusChanged',
        payload: expect.objectContaining({
          previousStatus: 'in_stock',
          newStatus: 'out_of_stock'
        })
      })
    );
    expect(deps.eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        eventType: 'ProductOutOfStock',
        aggregateId: 'product-3',
        payload: expect.objectContaining({
          previousStock: 6
        })
      })
    );
  });

  it('skips inventory update event when product is missing', async () => {
    const deps = makeDependencies();
    deps.productRepository.findById.mockResolvedValue(null);
    const handler = new ProductInventoryUpdatedHandler(
      deps.productRepository as never,
      deps.eventPublisher as never,
      deps.idGenerator as never,
      deps.dateTimeService as never
    );

    await handler.handle({
      eventId: 'e4',
      eventType: 'ProductInventoryUpdated',
      aggregateId: 'product-missing',
      version: 1,
      timestamp: now,
      payload: {
        productId: 'product-missing',
        previousStock: { available: 3, reserved: 0, total: 3 },
        newStock: { available: 2, reserved: 0, total: 2 },
        changeReason: 'sale',
        updatedBy: 'inventory',
        updateTimestamp: now
      }
    });

    expect(deps.eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('publishes initialization request when product has initial inventory', async () => {
    const deps = makeDependencies();
    const handler = new ProductCreatedInventoryHandler(
      deps.eventPublisher as never,
      deps.idGenerator as never,
      deps.dateTimeService as never
    );

    await handler.handle({
      eventId: 'e5',
      eventType: 'ProductCreated',
      aggregateId: 'product-5',
      version: 1,
      timestamp: now,
      payload: {
        productId: 'product-5',
        initialInventoryCount: 50,
        sellerId: 'seller-5'
      }
    });

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ProductInventoryInitializationRequested',
        payload: expect.objectContaining({
          productId: 'product-5',
          initialQuantity: 50
        })
      })
    );
  });

  it('provides handler factory functions for registration', () => {
    const deps = makeDependencies();

    expect(
      productInventoryVerifiedHandler(deps as never)
    ).toBeInstanceOf(ProductInventoryVerifiedHandler);
    expect(
      productInventoryVerificationFailedHandler(deps as never)
    ).toBeInstanceOf(ProductInventoryVerificationFailedHandler);
    expect(
      productInventoryUpdatedHandler(deps as never)
    ).toBeInstanceOf(ProductInventoryUpdatedHandler);
    expect(
      productCreatedInventoryHandler(deps as never)
    ).toBeInstanceOf(ProductCreatedInventoryHandler);
  });
});
