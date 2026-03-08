import { EventEnvelope, eventBus, inMemoryEventBus } from '../../../../shared/events/eventBus';

describe('Community service shared event bus propagation', () => {
  const eventType = 'CommunitySharedBusPropagationTest';

  afterEach(() => {
    eventBus.removeAllSubscribers(eventType);
    eventBus.clearDLQ(eventType);
  });

  it('uses a shared singleton bus instance and propagates events across aliases', async () => {
    const received: EventEnvelope[] = [];

    inMemoryEventBus.subscribe(eventType, {
      name: 'community-test-subscriber',
      handler: async envelope => {
        received.push(envelope);
      }
    });

    await eventBus.publish(eventType, { communityId: 'community-1' }, { source: 'community-service' });

    expect(inMemoryEventBus).toBe(eventBus);
    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe(eventType);
    expect(received[0].data).toEqual({ communityId: 'community-1' });
    expect(received[0].metadata?.source).toBe('community-service');
  });
});
