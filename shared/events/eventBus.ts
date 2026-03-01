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

export interface EventBusAuditEntry {
  eventType: string;
  eventId: string;
  correlationId?: string;
  sagaId?: string;
  timestamp: string;
  dataSummary: string;
}

export interface IEventPublisher {
  publish(eventType: string, data: any, metadata?: any): Promise<void>;
}

export interface IEventSubscriber {
  subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void>;
  subscribe(eventType: string, options: { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void>;
}

export interface IEventBus extends IEventPublisher, IEventSubscriber {}

/**
 * Reserved event names:
 * - 'dead-letter': Internal event emitted when a subscriber exhausts all retries
 */
export class EventBus extends EventEmitter implements IEventBus {
  private logger: typeof console;
  private auditMiddlewares: ((envelope: EventEnvelope) => void)[] = [];
  private dlq: Map<string, EventEnvelope[]> = new Map();
  private _inFlightCount = 0;
  private _shuttingDown = false;
  private _shutdownResolvers: Array<() => void> = [];

  constructor() {
    super();
    const maxListeners = parseInt(process.env.EVENT_BUS_MAX_LISTENERS ?? '200', 10);
    this.setMaxListeners(isNaN(maxListeners) ? 200 : maxListeners);
    this.logger = console;
    this.initializeAudit();
  }

  private initializeAudit(): void {
    this.addAuditMiddleware((envelope: EventEnvelope) => {
      try {
        let dataSummary: string;
        try {
          dataSummary = JSON.stringify(envelope.data).substring(0, 256);
        } catch {
          dataSummary = String(envelope.data).substring(0, 256);
        }
        import('../audit/audit.service').then(({ AuditService }) => {
          const auditService = AuditService.getInstance();
          auditService.saveEventBusAudit({
            eventType: envelope.eventType,
            eventId: envelope.eventId!,
            correlationId: envelope.correlationId,
            sagaId: envelope.sagaId,
            timestamp: envelope.metadata?.timestamp || new Date().toISOString(),
            dataSummary
          });
        }).catch(err => this.logger.error('[EventBus] Audit error:', err));
      } catch (err) {
        this.logger.error('[EventBus] Audit middleware error:', err);
      }
    });
  }

  addAuditMiddleware(fn: (envelope: EventEnvelope) => void): void {
    this.auditMiddlewares.push(fn);
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

    // Run audit middleware
    for (const middleware of this.auditMiddlewares) {
      try {
        middleware(envelope);
      } catch (err) {
        this.logger.error('[EventBus] Audit middleware error:', err);
      }
    }

    if (this._shuttingDown) {
      this.logger.warn(`[EventBus] Skipping publish during shutdown: ${finalEventType}`);
      return;
    }

    // Emit event asynchronously to decouple publisher from subscribers
    this._inFlightCount++;
    setImmediate(() => {
      try {
        this.emit(finalEventType, envelope);
      } finally {
        this._inFlightCount--;
        if (this._inFlightCount === 0 && this._shuttingDown) {
          this._shutdownResolvers.forEach(resolve => resolve());
          this._shutdownResolvers = [];
        }
      }
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

    // DLQ: push to dead-letter queue instead of throwing
    if (!this.dlq.has(eventType)) {
      this.dlq.set(eventType, []);
    }
    this.dlq.get(eventType)!.push(envelope);
    this.logger.error(`[EventBus][${subscriberName}] DLQ: ${eventType} after ${retries} retries`, lastError);
    
    // Emit dead-letter event with normalized EventEnvelope contract
    const deadLetterEnvelope: EventEnvelope = {
      eventType: 'dead-letter',
      data: {
        failedEventType: eventType,
        originalEnvelope: envelope,
        subscriberName,
        error: lastError?.message || String(lastError)
      },
      metadata: {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        correlationId: envelope.correlationId,
        sagaId: envelope.sagaId
      },
      eventId: uuidv4(),
      correlationId: envelope.correlationId,
      sagaId: envelope.sagaId
    };
    super.emit('dead-letter', deadLetterEnvelope);
  }

  getDLQ(): Map<string, EventEnvelope[]> {
    return new Map(this.dlq);
  }

  async replayDLQ(eventType: string): Promise<void> {
    const envelopes = this.dlq.get(eventType);
    if (!envelopes || envelopes.length === 0) return;
    this.dlq.delete(eventType);
    for (const envelope of envelopes) {
      super.emit(eventType, envelope);
    }
  }

  async shutdown(): Promise<void> {
    this._shuttingDown = true;
    if (this._inFlightCount === 0) return;
    return new Promise<void>(resolve => {
      this._shutdownResolvers.push(resolve);
    });
  }

  getSubscriberCount(eventType: string): number {
    return this.listenerCount(eventType);
  }
}

export const eventBus = new EventBus();
export const inMemoryEventBus = eventBus;
export type EventHandler = (envelope: EventEnvelope) => Promise<void>;