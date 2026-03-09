import { QueueService } from './queue.service';

describe('QueueService', () => {
  it('enqueues and dequeues by highest priority first', async () => {
    const queue = new QueueService();

    const lowId = await queue.enqueue('notifications', { type: 'low' }, 1);
    const highId = await queue.enqueue('notifications', { type: 'high' }, 5);

    const first = await queue.dequeue<{ type: string }>('notifications');
    const second = await queue.dequeue<{ type: string }>('notifications');

    expect(lowId).toMatch(/^q_/);
    expect(highId).toMatch(/^q_/);
    expect(first?.id).toBe(highId);
    expect(first?.payload).toEqual({ type: 'high' });
    expect(second?.id).toBe(lowId);
    expect(second?.payload).toEqual({ type: 'low' });
  });

  it('returns null when queue is empty', async () => {
    const queue = new QueueService();

    await expect(queue.dequeue('missing')).resolves.toBeNull();
  });

  it('returns empty dead-letter queue by default', async () => {
    const queue = new QueueService();

    await expect(queue.getDeadLetterQueue('notifications')).resolves.toEqual([]);
  });
});
