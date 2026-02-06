import { EventEmitter } from 'events';

export interface EventEnvelope {
  eventType: string;
  data: any;
  metadata?: any;
}

export class EventBus extends EventEmitter {
  async publish(eventType: string, data: any, metadata?: any): Promise<void> {
    const envelope: EventEnvelope = {
      eventType,
      data,
      metadata
    };
    console.log(`[EventBus] Publishing: ${eventType}`);
    this.emit(eventType, envelope);
    return Promise.resolve();
  }

  async subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void> {
    this.on(eventType, async (envelope: EventEnvelope) => {
      try {
        await handler(envelope);
      } catch (error) {
        console.error(`[EventBus] Error handling event ${eventType}:`, error);
      }
    });
    return Promise.resolve();
  }
}

export const eventBus = new EventBus();