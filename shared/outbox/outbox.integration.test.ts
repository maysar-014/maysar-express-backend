import { EventEnvelope } from '../events/eventBus';
import { OutboxEventPublisher } from './outbox.event-publisher';
import type { IOutboxRepository } from './outbox.repository';

class InMemoryOutboxRepository implements IOutboxRepository {
  public saved: EventEnvelope[] = [];

  async save(envelope: EventEnvelope): Promise<void> {
    this.saved.push(envelope);
  }

  async getPending(): Promise<never[]> {
    return [];
  }

  async markProcessed(): Promise<void> {
    return;
  }
}

describe('Outbox Integration', () => {
  it('persists domain events into outbox envelope format', async () => {
    const repository = new InMemoryOutboxRepository();
    const publisher = new OutboxEventPublisher(repository);

    await publisher.publish({
      eventId: 'evt-outbox-1',
      eventType: 'OrderCreated.v1',
      aggregateId: 'order-1',
      version: 1,
      timestamp: new Date('2026-03-09T00:00:00.000Z'),
      payload: { orderId: 'order-1', total: 1200 }
    });

    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0].eventType).toBe('OrderCreated.v1');
    expect(repository.saved[0].eventId).toBe('evt-outbox-1');
  });
});

