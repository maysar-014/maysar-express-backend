import type { IOutboxRepository } from './outbox.repository';
import { DomainEvent, OutboxEventPublisher } from './outbox.event-publisher';

describe('OutboxEventPublisher', () => {
  const buildEvent = (eventId: string, overrides: Partial<DomainEvent> = {}): DomainEvent => ({
    eventId,
    eventType: 'OrderCreated',
    aggregateId: 'order-1',
    version: 1,
    timestamp: new Date('2026-03-07T12:00:00.000Z'),
    payload: { orderId: 'order-1' },
    metadata: { source: 'order-service' },
    ...overrides
  });

  it('publishes a domain event into outbox envelope format', async () => {
    const save = jest.fn<ReturnType<IOutboxRepository['save']>, Parameters<IOutboxRepository['save']>>(
      async () => undefined
    );
    const repository: IOutboxRepository = {
      save,
      getPending: jest.fn(async () => []),
      markProcessed: jest.fn(async () => undefined)
    };
    const publisher = new OutboxEventPublisher(repository);
    const event = buildEvent('evt-1');

    await publisher.publish(event);

    expect(save).toHaveBeenCalledWith({
      eventId: 'evt-1',
      eventType: 'OrderCreated',
      data: event,
      timestamp: event.timestamp,
      metadata: event.metadata
    });
  });

  it('publishes all events in the batch', async () => {
    const save = jest.fn<ReturnType<IOutboxRepository['save']>, Parameters<IOutboxRepository['save']>>(
      async () => undefined
    );
    const repository: IOutboxRepository = {
      save,
      getPending: jest.fn(async () => []),
      markProcessed: jest.fn(async () => undefined)
    };
    const publisher = new OutboxEventPublisher(repository);
    const events = [buildEvent('evt-1'), buildEvent('evt-2'), buildEvent('evt-3')];

    await publisher.publishAll(events);

    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.map(call => (call[0].eventId as string))).toEqual(['evt-1', 'evt-2', 'evt-3']);
  });
});
