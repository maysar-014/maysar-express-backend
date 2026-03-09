import { ProductionCompletionSaga } from './ProductionCompletionSaga';

describe('ProductionCompletionSaga', () => {
  it('updates order status and publishes production completed event', async () => {
    const orderRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'prod-1', orderId: 'ord-1' })
    };
    const orderService = {
      updateOrderStatus: jest.fn().mockResolvedValue(undefined)
    };
    const eventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    };
    const saga = new ProductionCompletionSaga(
      orderRepo as never,
      {} as never,
      orderService as never,
      {} as never,
      eventBus as never
    );

    await saga.execute('prod-1');

    expect(orderRepo.findById).toHaveBeenCalledWith('prod-1');
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('ord-1', 'READY_FOR_FULFILLMENT');
    expect(eventBus.publish).toHaveBeenCalledWith({
      type: 'ProductionCompleted',
      payload: { orderId: 'prod-1' }
    });
  });

  it('swallows errors in compensation path', async () => {
    const saga = new ProductionCompletionSaga(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      { updateOrderStatus: jest.fn() } as never,
      {} as never,
      { publish: jest.fn() } as never
    );

    await expect(saga.execute('missing')).resolves.toBeUndefined();
  });
});

