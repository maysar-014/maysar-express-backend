/**
 * Queue service - async processing, priority queues, dead letter
 */

export interface QueueItem<T = any> {
  id: string;
  payload: T;
  priority: number;
  createdAt: Date;
}

export interface IQueueService {
  enqueue<T>(queueName: string, payload: T, priority?: number): Promise<string>;
  dequeue<T>(queueName: string): Promise<QueueItem<T> | null>;
  getDeadLetterQueue<T>(queueName: string): Promise<QueueItem<T>[]>;
}

export class QueueService implements IQueueService {
  private queues = new Map<string, QueueItem[]>();
  private deadLetter = new Map<string, QueueItem[]>();

  async enqueue<T>(queueName: string, payload: T, priority = 0): Promise<string> {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const list = this.queues.get(queueName) ?? [];
    list.push({
      id,
      payload,
      priority,
      createdAt: new Date()
    });
    list.sort((a, b) => b.priority - a.priority);
    this.queues.set(queueName, list);
    return id;
  }

  async dequeue<T>(queueName: string): Promise<QueueItem<T> | null> {
    const list = this.queues.get(queueName) ?? [];
    const item = list.shift();
    if (item) this.queues.set(queueName, list);
    return (item as QueueItem<T>) ?? null;
  }

  async getDeadLetterQueue<T>(queueName: string): Promise<QueueItem<T>[]> {
    return (this.deadLetter.get(queueName) ?? []) as QueueItem<T>[];
  }
}
