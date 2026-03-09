import { EventPublisher } from './EventPublisher';

describe('EventPublisher', () => {
  it('publishes scheduled and completed production events', async () => {
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const publisher = new EventPublisher(eventBus as never);

    await publisher.publishProductionScheduled('order-1');
    await publisher.publishProductionCompleted('order-1', 120);

    expect(eventBus.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'ProductionScheduled',
        payload: expect.objectContaining({ orderId: 'order-1' })
      })
    );
    expect(eventBus.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'ProductionCompleted',
        payload: expect.objectContaining({ orderId: 'order-1', producedQty: 120 })
      })
    );
  });
});
