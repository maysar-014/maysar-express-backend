import { EventEnvelope, eventBus, inMemoryEventBus } from '../../../../../shared/events/eventBus';

describe('Community Service Shared Event Bus Integration', () => {
  const eventType = 'CommunityIntegrationEvent';

  afterEach(() => {
    eventBus.removeAllSubscribers(eventType);
    eventBus.clearDLQ(eventType);
  });

  it('propagates events across shared event bus aliases', async () => {
    const received: EventEnvelope[] = [];

    await inMemoryEventBus.subscribe(eventType, {
      name: 'community-integration-subscriber',
      handler: async envelope => {
        received.push(envelope);
      }
    });

    await eventBus.publish(eventType, { communityId: 'community-1' }, { source: 'community-service' });

    expect(inMemoryEventBus).toBe(eventBus);
    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe(eventType);
    expect(received[0].data).toEqual({ communityId: 'community-1' });
  });
});

