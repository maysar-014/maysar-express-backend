// Shared Event Bus Interface
export interface Event {
  eventId: string;
  eventVersion: number;
  eventType: string;
  producer: string;
  timestamp: string;
  payload: any;
}

export interface EventHandler<T = any> {
  (event: T): Promise<void>;
}

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register an event handler
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(eventType: string, payload: any): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const event: Event = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventVersion: 1,
      eventType,
      producer: 'inventory-service',
      timestamp: new Date().toISOString(),
      payload
    };

    // Execute all handlers concurrently
    const promises = handlers.map(handler => handler(event));
    await Promise.all(promises);
  }

  /**
   * Remove an event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Clear all handlers for an event type
   */
  clear(eventType: string): void {
    this.handlers.delete(eventType);
  }
}

// Global event bus instance
export const eventBus = new EventBus();
