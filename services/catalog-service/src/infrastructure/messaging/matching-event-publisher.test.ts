jest.mock('@shared-events/eventBus', () => ({}), { virtual: true });

import { MatchingEventPublisher } from './matching-event-publisher';

describe('MatchingEventPublisher', () => {
  it('publishes all matching events with eventType as topic', async () => {
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const publisher = new MatchingEventPublisher(eventBus as never);

    const events = [
      { eventType: 'ProductMatchFound' },
      { eventType: 'ProductMatchConfirmationRequired' },
      { eventType: 'ProductMatchConfirmed' },
      { eventType: 'ProductMatchRejected' },
      { eventType: 'NewProductCreated' }
    ];

    await publisher.publishMatchFound(events[0] as never);
    await publisher.publishConfirmationRequired(events[1] as never);
    await publisher.publishMatchConfirmed(events[2] as never);
    await publisher.publishMatchRejected(events[3] as never);
    await publisher.publishNewProductCreated(events[4] as never);

    expect(eventBus.publish).toHaveBeenCalledTimes(5);
    expect(eventBus.publish).toHaveBeenNthCalledWith(1, 'ProductMatchFound', events[0]);
    expect(eventBus.publish).toHaveBeenNthCalledWith(2, 'ProductMatchConfirmationRequired', events[1]);
    expect(eventBus.publish).toHaveBeenNthCalledWith(3, 'ProductMatchConfirmed', events[2]);
    expect(eventBus.publish).toHaveBeenNthCalledWith(4, 'ProductMatchRejected', events[3]);
    expect(eventBus.publish).toHaveBeenNthCalledWith(5, 'NewProductCreated', events[4]);
  });
});
