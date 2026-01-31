/**
 * Event Bus Adapter
 * Handles event publishing and subscription
 */

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  payload: any;
  timestamp: Date;
}

export type EventHandler = (event: EventEnvelope) => Promise<void>;

export class EventBusAdapter {
  private subscribers: Map<string, EventHandler[]> = new Map();
  private eventHistory: EventEnvelope[] = [];

  async publish(eventType: string, payload: any): Promise<void> {
    const envelope: EventEnvelope = {
      eventId: `${eventType}-${Date.now()}-${Math.random()}`,
      eventType,
      payload,
      timestamp: new Date()
    };

    this.eventHistory.push(envelope);

    const handlers = this.subscribers.get(eventType) || [];
    await Promise.all(handlers.map(handler => handler(envelope).catch(err => {
      console.error(`Error handling ${eventType}:`, err);
    })));
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  getEventHistory(): EventEnvelope[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}
