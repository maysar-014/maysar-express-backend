// Shared Event Bus Implementation for Compliance Service
// Simple in-memory event bus for compliance event communication

import { EventEmitter } from 'events';

export interface Event {
  eventId: string;
  eventType: string;
  eventVersion: number;
  producer: string;
  timestamp: string;
  entityType: string;
  entityId: string;
  userId: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EventHandler {
  eventType: string;
  handler: (event: Event) => Promise<void>;
}

export class EventBus extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multiple handlers
  }

  /**
   * Register an event handler
   */
  onEvent(eventType: string, handler: (event: Event) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push({ eventType, handler });
  }

  /**
   * Publish an event to all registered handlers
   */
  async publish(event: Event): Promise<void>;
  async publish(eventType: string, payload: any): Promise<void>;
  async publish(eventOrType: Event | string, payload?: any): Promise<void> {
    let event: Event;

    if (typeof eventOrType === 'string') {
      // Create event from type and payload
      event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType: eventOrType,
        eventVersion: 1,
        producer: 'compliance-service',
        timestamp: new Date().toISOString(),
        entityType: 'compliance',
        entityId: payload?.id || 'system',
        userId: payload?.userId || 'system',
        payload: payload || {},
      };
    } else {
      event = eventOrType;
    }

    console.log(`📢 Publishing compliance event: ${event.eventType} (${event.eventId})`);

    const handlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers concurrently
    const promises = handlers.map(async ({ handler }) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`❌ Error in compliance event handler for ${event.eventType}:`, error);
        // In production, you might want to send this to a monitoring system
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllHandlers(eventType: string): void {
    this.handlers.delete(eventType);
  }

  /**
   * Clear all handlers
   */
  clearAllHandlers(): void {
    this.handlers.clear();
  }
}

// Global event bus instance for compliance service
export const eventBus = new EventBus();
