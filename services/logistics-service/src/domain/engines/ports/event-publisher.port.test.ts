import type { DomainEvent, EventPublisherPort } from './event-publisher.port';

describe('EventPublisherPort contract', () => {
  it('supports publish, batch publish, subscribe, and unsubscribe', async () => {
    const subscriptions = new Map<string, Set<(event: DomainEvent) => Promise<void>>>();

    const publish = jest.fn(async (event: DomainEvent) => {
      const handlers = subscriptions.get(event.eventType) ?? new Set();
      for (const handler of handlers) {
        await handler(event);
      }
    });

    const publishBatch = jest.fn(async (events: DomainEvent[]) => {
      for (const event of events) {
        await publish(event);
      }
    });

    const subscribe = jest.fn((eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
      if (!subscriptions.has(eventType)) {
        subscriptions.set(eventType, new Set());
      }
      subscriptions.get(eventType)?.add(handler);
    });

    const unsubscribe = jest.fn((eventType: string, handler: (event: DomainEvent) => Promise<void>) => {
      subscriptions.get(eventType)?.delete(handler);
    });

    const publisher: EventPublisherPort = {
      publish,
      publishBatch,
      subscribe,
      unsubscribe
    };

    const handledEvents: DomainEvent[] = [];
    const handler = jest.fn(async (event: DomainEvent) => {
      handledEvents.push(event);
    });

    const event: DomainEvent = {
      eventId: 'evt-1',
      eventType: 'route.assigned',
      aggregateId: 'route-1',
      aggregateType: 'route',
      eventData: { driverId: 'driver-1' },
      timestamp: new Date('2026-01-02T00:00:00.000Z'),
      metadata: { correlationId: 'corr-1' }
    };

    publisher.subscribe('route.assigned', handler);
    await publisher.publish(event);
    await publisher.publishBatch([event]);
    publisher.unsubscribe('route.assigned', handler);
    await publisher.publish(event);

    expect(subscribe).toHaveBeenCalledWith('route.assigned', handler);
    expect(publish).toHaveBeenCalledTimes(3);
    expect(publishBatch).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handledEvents).toEqual([event, event]);
  });
});
