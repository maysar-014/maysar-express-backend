import { EventEmitter } from 'events';

export interface EventEnvelope {
  eventType: string;
  data: any;
  metadata?: any;
  eventId?: string;
  sagaId?: string;
}

export interface IEventPublisher {
  publish(eventType: string, data: any, metadata?: any): Promise<void>;
}

export interface IEventSubscriber {
  subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void>;
  subscribe(eventType: string, options: { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void>;
}

export class EventBus extends EventEmitter implements IEventPublisher, IEventSubscriber {
  async publish(eventType: string, data: any, metadata?: any): Promise<void>;
  async publish(eventObject: { type?: string; event?: string; data?: any; payload?: any;[key: string]: any }): Promise<void>;
  async publish(eventTypeOrObject: string | { type?: string; event?: string; data?: any; payload?: any;[key: string]: any }, data?: any, metadata?: any): Promise<void> {
    let finalEventType: string;
    let finalData: any;
    let finalMetadata: any;

    if (typeof eventTypeOrObject === 'string') {
      // Original signature: publish(eventType, data, metadata?)
      finalEventType = eventTypeOrObject;
      finalData = data;
      finalMetadata = metadata;
    } else {
      // Object signature: publish({ type, data }) or publish({ event, payload, ... })
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
      metadata: finalMetadata,
      eventId: finalMetadata?.eventId,
      sagaId: finalMetadata?.sagaId
    };
    console.log(`[EventBus] Publishing: ${finalEventType}`);
    this.emit(finalEventType, envelope);
    return Promise.resolve();
  }

  async subscribe(eventType: string, handlerOrOptions: ((envelope: EventEnvelope) => Promise<void>) | { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void> {
    const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : handlerOrOptions.handler;
    const subscriberName = typeof handlerOrOptions === 'function' ? 'anonymous' : handlerOrOptions.name;

    this.on(eventType, async (envelope: EventEnvelope) => {
      try {
        await handler(envelope);
      } catch (error) {
        console.error(`[EventBus][${subscriberName}] Error handling event ${eventType}:`, error);
      }
    });
    return Promise.resolve();
  }
}

export const eventBus = new EventBus();