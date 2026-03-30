/**
 * Event Store
 * Persists domain events for event sourcing
 */

export interface StoredEvent {
  aggregateId?: string;
  type?: string;
  [key: string]: unknown;
}

export class EventStore {
  private readonly events: StoredEvent[] = [];

  async append(event: StoredEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async getEvents(aggregateId?: string): Promise<StoredEvent[]> {
    if (!aggregateId) {
      return this.events.map(event => ({ ...event }));
    }

    return this.events
      .filter(event => event.aggregateId === aggregateId)
      .map(event => ({ ...event }));
  }

  async getEventsByType(type: string): Promise<StoredEvent[]> {
    return this.events
      .filter(event => event.type === type)
      .map(event => ({ ...event }));
  }

  clear(): void {
    this.events.length = 0;
  }
}
