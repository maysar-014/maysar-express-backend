function generateId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  data: any;
  timestamp: Date;
  version: string;
  source: string;
}

export interface EventConsumer {
  name: string;
  handler: (envelope: EventEnvelope) => Promise<void>;
}

export class SimpleEventBus {
  private subscribers: Map<string, EventConsumer[]> = new Map();

  async subscribe(eventPattern: string, consumer: EventConsumer): Promise<void> {
    if (!this.subscribers.has(eventPattern)) {
      this.subscribers.set(eventPattern, []);
    }
    this.subscribers.get(eventPattern)!.push(consumer);
  }

  async publish(eventType: string, data: any): Promise<void> {
    const envelope: EventEnvelope = {
      eventId: generateId(),
      eventType,
      data,
      timestamp: new Date(),
      version: 'v1',
      source: 'saga'
    };

    const consumers = this.subscribers.get(eventType) || [];
    
    for (const consumer of consumers) {
      try {
        await consumer.handler(envelope);
      } catch (error) {
        console.error(`Error in consumer ${consumer.name} for event ${eventType}:`, error);
      }
    }
  }
}

export const eventBus = new SimpleEventBus();