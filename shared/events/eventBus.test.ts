import { EventBus, EventEnvelope } from './eventBus';

describe('EventBus compatibility contracts', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('supports legacy publish(eventType, data, metadata)', async () => {
    const received: EventEnvelope[] = [];
    bus.subscribe('LegacyEvent', async (envelope: EventEnvelope) => {
      received.push(envelope);
    });

    await bus.publish('LegacyEvent', { value: 1 }, { source: 'test-suite' });

    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe('LegacyEvent');
    expect(received[0].data).toEqual({ value: 1 });
    expect(received[0].metadata?.source).toBe('test-suite');
  });

  it('supports envelope-first publish(envelope)', async () => {
    const received: EventEnvelope[] = [];
    bus.subscribe('EnvelopeEvent', async (envelope: EventEnvelope) => {
      received.push(envelope);
    });

    const envelope: EventEnvelope = {
      eventId: 'evt-envelope-1',
      eventType: 'EnvelopeEvent',
      data: { ok: true },
      timestamp: new Date('2026-03-07T00:00:00.000Z')
    };

    await bus.publish(envelope);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(expect.objectContaining(envelope));
  });

  it('supports named subscriptions and subscriber inspection', () => {
    bus.subscribe('NamedEvent', {
      name: 'named-handler',
      handler: async () => {}
    });

    expect(bus.getSubscriberCount('NamedEvent')).toBe(1);
    expect(bus.getSubscribers('NamedEvent')).toEqual(['named-handler']);
  });

  it('captures handler failures in DLQ and keeps processing result observable', async () => {
    bus.subscribe('FailingEvent', {
      name: 'always-fails',
      handler: async () => {
        throw new Error('boom');
      }
    });

    await expect(bus.publish('FailingEvent', { test: true })).rejects.toThrow('Failed to process event');

    const dlq = bus.getDLQ();
    expect(dlq.get('FailingEvent')).toHaveLength(1);
    expect(bus.getDLQSize('FailingEvent')).toBe(1);
    expect(bus.getDLQSizes().FailingEvent).toBe(1);
  });

  it('accepts legacy object events with type/data', async () => {
    const received: EventEnvelope[] = [];
    bus.subscribe('ObjectEvent', async (envelope: EventEnvelope) => {
      received.push(envelope);
    });

    const legacyObjectEvent: EventEnvelope = {
      type: 'ObjectEvent',
      data: { answer: 42 },
      metadata: { producer: 'analytics-service' }
    };

    await bus.publish(legacyObjectEvent);

    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe('ObjectEvent');
    expect(received[0].data).toEqual({ answer: 42 });
    expect(received[0].metadata?.producer).toBe('analytics-service');
  });
});
