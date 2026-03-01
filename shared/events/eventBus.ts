import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface EventEnvelope {
  eventType: string;
  data: any;
  metadata?: any;
  eventId?: string;
  sagaId?: string;
  correlationId?: string;
}

export interface IEventPublisher {
  publish(eventType: string, data: any, metadata?: any): Promise<void>;
}

export interface IEventSubscriber {
  subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void>;
  subscribe(eventType: string, options: { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void>;
}

export interface IEventBus extends IEventPublisher, IEventSubscriber {}

export class EventBus extends EventEmitter implements IEventBus {
  private logger: typeof console;

  constructor() {
    super();
    this.setMaxListeners(100);
    this.logger = console;
  }

  async publish(eventType: string, data: any, metadata?: any): Promise<void>;
  async publish(eventObject: { type?: string; event?: string; data?: any; payload?: any;[key: string]: any }): Promise<void>;
  async publish(eventTypeOrObject: string | { type?: string; event?: string; data?: any; payload?: any;[key: string]: any }, data?: any, metadata?: any): Promise<void> {
    let finalEventType: string;
    let finalData: any;
    let finalMetadata: any;

    if (typeof eventTypeOrObject === 'string') {
      finalEventType = eventTypeOrObject;
      finalData = data;
      finalMetadata = metadata;
    } else {
      const obj = eventTypeOrObject;
      finalEventType = obj.type || obj.event || 'unknown';
      finalData = obj.data || obj.payload;
      finalMetadata = { ...obj };
      delete finalMetadata.type;
      delete finalMetadata.event;
      delete finalMetadata.data;
      delete finalMetadata.payload;
    }

    const envelope: EventEnvelope = {
      eventType: finalEventType,
      data: finalData,
      metadata: {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        ...finalMetadata
      },
      eventId: finalMetadata?.eventId || uuidv4(),
      sagaId: finalMetadata?.sagaId,
      correlationId: finalMetadata?.correlationId
    };

    this.logger.log(`[EventBus] Publishing: ${finalEventType}`, {
      eventId: envelope.eventId,
      correlationId: envelope.metadata?.correlationId
    });

    // Emit event asynchronously to decouple publisher from subscribers
    setImmediate(() => {
      this.emit(finalEventType, envelope);
    });
  }

  async subscribe(eventType: string, handlerOrOptions: ((envelope: EventEnvelope) => Promise<void>) | { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void> {
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : handlerOrOptions.handler;
    const subscriberName = typeof handlerOrOptions === 'function' ? 'anonymous' : handlerOrOptions.name;

    this.on(eventType, async (envelope: EventEnvelope) => {
      try {
        await this.handleWithRetry(eventType, envelope, handler, subscriberName);
      } catch (error) {
        this.logger.error(`[EventBus][${subscriberName}] Final failure for event ${eventType}:`, error);
      }
    });
  }

  private async handleWithRetry(
    eventType: string,
    envelope: EventEnvelope,
    handler: (envelope: EventEnvelope) => Promise<void>,
    subscriberName: string,
    retries: number = 3
  ): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await handler(envelope);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(`[EventBus][${subscriberName}] Attempt ${attempt} failed for ${eventType}:`, error);
        if (attempt < retries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 50));
        }
      }
    }

    throw lastError;
  }
}

export const eventBus = new EventBus();
export const inMemoryEventBus = eventBus;
export type EventHandler = (envelope: EventEnvelope) => Promise<void>;