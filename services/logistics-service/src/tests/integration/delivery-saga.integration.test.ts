import { EventEnvelope, eventBus } from '../../../../../shared/events/eventBus';

describe('Delivery Saga Integration', () => {
  const requestEvent = 'OrderFulfillmentRequested.v1';
  const assignedEvent = 'DeliveryAssigned.v1';
  const compensatedEvent = 'DeliveryCompensated.v1';

  afterEach(() => {
    eventBus.removeAllSubscribers(requestEvent);
    eventBus.removeAllSubscribers(assignedEvent);
    eventBus.removeAllSubscribers(compensatedEvent);
    eventBus.clearDLQ(requestEvent);
    eventBus.clearDLQ(assignedEvent);
    eventBus.clearDLQ(compensatedEvent);
  });

  it('orchestrates assignment and compensation events in a saga-style flow', async () => {
    const received: string[] = [];
    const envelopes: EventEnvelope[] = [];

    await eventBus.subscribe(requestEvent, {
      name: 'delivery-saga-assign-step',
      handler: async envelope => {
        received.push(envelope.eventType || '');
        envelopes.push(envelope);

        await eventBus.publish(assignedEvent, {
          orderId: (envelope.data as { orderId: string }).orderId,
          deliveryId: 'delivery-1'
        });
      }
    });

    await eventBus.subscribe(assignedEvent, {
      name: 'delivery-saga-compensation-step',
      handler: async envelope => {
        received.push(envelope.eventType || '');
        envelopes.push(envelope);

        await eventBus.publish(compensatedEvent, {
          deliveryId: (envelope.data as { deliveryId: string }).deliveryId,
          reason: 'simulated downstream failure'
        });
      }
    });

    await eventBus.subscribe(compensatedEvent, {
      name: 'delivery-saga-observer',
      handler: async envelope => {
        received.push(envelope.eventType || '');
        envelopes.push(envelope);
      }
    });

    await eventBus.publish(requestEvent, { orderId: 'order-1' }, { source: 'order-service' });

    expect(received).toEqual([requestEvent, assignedEvent, compensatedEvent]);
    expect(envelopes[0].data).toEqual({ orderId: 'order-1' });
    expect((envelopes[1].data as { deliveryId: string }).deliveryId).toBe('delivery-1');
    expect((envelopes[2].data as { reason: string }).reason).toContain('failure');
  });
});

