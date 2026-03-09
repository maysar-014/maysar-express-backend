import { BuyBoxEventPublisher } from './buy-box-event-publisher';
import { BuyBoxComputedEvent } from '../../domain/events/buy-box-events';

describe('BuyBoxEventPublisher', () => {
  it('publishes computed event via event bus using eventType', async () => {
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const publisher = new BuyBoxEventPublisher(eventBus as never);
    const event = new BuyBoxComputedEvent('product-1', 'seller-1', 98.5, 2, new Date('2026-03-08T00:00:00.000Z'));

    await publisher.publishComputed(event);

    expect(eventBus.publish).toHaveBeenCalledWith('BuyBoxComputed', event);
  });
});
