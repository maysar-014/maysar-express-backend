import { randomUUID } from 'crypto';

export interface EventEnvelope<T = unknown> {
  eventId?: string;
  eventType?: string;
  version?: string;
  producer?: string;
  data?: T;
  type?: string;
  event?: string;
  payload?: T;
  eventData?: T;
  aggregateId?: string;
  aggregateType?: string;
  sagaId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date | string;
  correlationId?: string;
}

export type EventHandler<T = EventEnvelope> = (envelope: T) => Promise<void>;

export interface SubscriptionOptions<T = EventEnvelope> {
  name: string;
  handler: EventHandler<T>;
}

export interface IEventPublisher {
  publish(envelope: EventEnvelope): Promise<void>;
  publish(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  emit(envelope: EventEnvelope): Promise<void>;
  emit(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
}

export interface IEventSubscriber {
  subscribe<T = EventEnvelope>(eventType: string, handler: EventHandler<T>): Promise<void>;
  subscribe<T = EventEnvelope>(eventType: string, options: SubscriptionOptions<T>): Promise<void>;
}

export interface IEventBus extends IEventPublisher, IEventSubscriber {}

interface LegacyEventLike {
  type?: string;
  event?: string;
  eventType?: string;
  data?: unknown;
  payload?: unknown;
  eventData?: unknown;
  metadata?: Record<string, unknown>;
  timestamp?: Date | string;
  eventId?: string;
  correlationId?: string;
}

interface SubscriberEntry {
  name: string;
  handler: EventHandler<EventEnvelope>;
}

interface DeadLetterEntry {
  envelope: EventEnvelope;
  subscriberName: string;
  error: string;
  failedAt: Date;
}

export class EventBus implements IEventBus {
  private handlers = new Map<string, SubscriberEntry[]>();
  private deadLetterQueue = new Map<string, DeadLetterEntry[]>();

  async publish(envelope: EventEnvelope): Promise<void>;
  async publish(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  async publish(
    eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const envelope = this.normalizeEnvelope(eventTypeOrEnvelope, data, metadata);
    const eventType = envelope.eventType || 'unknown';
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      return;
    }

    const failures: string[] = [];
    await Promise.all(
      handlers.map(async ({ name, handler }) => {
        try {
          await handler(envelope);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.pushToDLQ(envelope, name, message);
          failures.push(`${name}: ${message}`);
        }
      })
    );

    if (failures.length > 0) {
      throw new Error(
        `Failed to process event "${eventType}" for ${failures.length} subscriber(s): ${failures.join('; ')}`
      );
    }
  }

  async emit(envelope: EventEnvelope): Promise<void>;
  async emit(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  async emit(
    eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (typeof eventTypeOrEnvelope === 'string') {
      await this.publish(eventTypeOrEnvelope, data, metadata);
      return;
    }

    await this.publish(this.normalizeEnvelope(eventTypeOrEnvelope, data, metadata));
  }

  async subscribe<T = EventEnvelope>(eventType: string, handler: EventHandler<T>): Promise<void>;
  async subscribe<T = EventEnvelope>(eventType: string, options: SubscriptionOptions<T>): Promise<void>;
  async subscribe<T = EventEnvelope>(
    eventType: string,
    handlerOrOptions: EventHandler<T> | SubscriptionOptions<T>
  ): Promise<void> {
    const current = this.handlers.get(eventType) || [];
    const nextSubscriber =
      typeof handlerOrOptions === 'function'
        ? { name: `${eventType}-handler-${current.length + 1}`, handler: handlerOrOptions as EventHandler<EventEnvelope> }
        : { name: handlerOrOptions.name, handler: handlerOrOptions.handler as EventHandler<EventEnvelope> };

    this.handlers.set(eventType, [...current, nextSubscriber]);
  }

  async on<T = EventEnvelope>(eventType: string, handler: EventHandler<T>): Promise<void>;
  async on<T = EventEnvelope>(eventType: string, options: SubscriptionOptions<T>): Promise<void>;
  async on<T = EventEnvelope>(
    eventType: string,
    handlerOrOptions: EventHandler<T> | SubscriptionOptions<T>
  ): Promise<void> {
    if (typeof handlerOrOptions === 'function') {
      await this.subscribe(eventType, handlerOrOptions);
      return;
    }

    await this.subscribe(eventType, handlerOrOptions);
  }

  getSubscriberCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  getSubscriberCounts(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [eventType, handlers] of Array.from(this.handlers.entries())) {
      result[eventType] = handlers.length;
    }
    return result;
  }

  getSubscribers(eventType: string): string[];
  getSubscribers(): Record<string, string[]>;
  getSubscribers(eventType?: string): string[] | Record<string, string[]> {
    if (eventType) {
      return (this.handlers.get(eventType) || []).map(sub => sub.name);
    }

    const result: Record<string, string[]> = {};
    for (const [type, handlers] of Array.from(this.handlers.entries())) {
      result[type] = handlers.map(sub => sub.name);
    }
    return result;
  }

  getDLQ(): Map<string, EventEnvelope[]> {
    const result = new Map<string, EventEnvelope[]>();
    for (const [eventType, entries] of Array.from(this.deadLetterQueue.entries())) {
      result.set(eventType, entries.map(entry => entry.envelope));
    }
    return result;
  }

  getDLQSize(eventType: string): number {
    return this.deadLetterQueue.get(eventType)?.length || 0;
  }

  getDLQSizes(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [eventType, entries] of Array.from(this.deadLetterQueue.entries())) {
      result[eventType] = entries.length;
    }
    return result;
  }

  clearDLQ(eventType?: string): void {
    if (eventType) {
      this.deadLetterQueue.delete(eventType);
      return;
    }
    this.deadLetterQueue.clear();
  }

  removeAllSubscribers(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
      return;
    }
    this.handlers.clear();
  }

  async shutdown(): Promise<void> {
    this.handlers.clear();
    this.deadLetterQueue.clear();
  }

  /**
   * Read-only view of the bus for health checks.
   *
   * Health endpoints previously reported messaging as "healthy" while admitting
   * the check was a stub. These accessors let a service report what is actually
   * wired (subscription count, dead-letter depth) instead of asserting a
   * capability it never tested. Deliberately read-only: it exposes no
   * subscription handles and cannot mutate the bus.
   */
  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return this.handlers.get(eventType)?.length ?? 0;
    }
    let total = 0;
    for (const entries of this.handlers.values()) {
      total += entries.length;
    }
    return total;
  }

  getEventTypeCount(): number {
    return this.handlers.size;
  }

  getDeadLetterCount(): number {
    let total = 0;
    for (const entries of this.deadLetterQueue.values()) {
      total += entries.length;
    }
    return total;
  }

  private pushToDLQ(envelope: EventEnvelope, subscriberName: string, error: string): void {
    const eventType = envelope.eventType || 'unknown';
    const current = this.deadLetterQueue.get(eventType) || [];
    current.push({
      envelope,
      subscriberName,
      error,
      failedAt: new Date()
    });
    this.deadLetterQueue.set(eventType, current);
  }

  private normalizeEnvelope(
    eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): EventEnvelope {
    if (typeof eventTypeOrEnvelope === 'string') {
      return this.createEnvelope(eventTypeOrEnvelope, data, metadata);
    }

    const envelopeEvent = eventTypeOrEnvelope as EventEnvelope;
    const legacyEvent = eventTypeOrEnvelope as LegacyEventLike;
    const eventType = envelopeEvent.eventType || legacyEvent.type || legacyEvent.event;
    if (!eventType) {
      throw new Error('Event type is required for publish');
    }

    const eventData =
      envelopeEvent.data !== undefined
        ? envelopeEvent.data
        : envelopeEvent.eventData !== undefined
          ? envelopeEvent.eventData
          : legacyEvent.data !== undefined
            ? legacyEvent.data
            : legacyEvent.payload !== undefined
              ? legacyEvent.payload
              : legacyEvent.eventData !== undefined
                ? legacyEvent.eventData
                : data;

    return this.createEnvelope(
      eventType,
      eventData,
      {
        ...(envelopeEvent.metadata || {}),
        ...(legacyEvent.metadata || {}),
        ...(metadata || {})
      },
      envelopeEvent.eventId || legacyEvent.eventId,
      envelopeEvent.timestamp || legacyEvent.timestamp,
      envelopeEvent.correlationId || legacyEvent.correlationId
    );
  }

  private createEnvelope(
    eventType: string,
    data: unknown,
    metadata?: Record<string, unknown>,
    eventId?: string,
    timestamp?: Date | string,
    correlationId?: string
  ): EventEnvelope {
    const resolvedTimestamp =
      timestamp instanceof Date ? timestamp : timestamp ? new Date(timestamp) : new Date();
    const resolvedCorrelationId =
      correlationId || this.getStringMetadataField(metadata, 'correlationId');
    const resolvedEventId = eventId || this.getStringMetadataField(metadata, 'eventId') || randomUUID();

    return {
      eventId: resolvedEventId,
      eventType,
      data,
      metadata,
      timestamp: resolvedTimestamp,
      correlationId: resolvedCorrelationId
    };
  }

  private getStringMetadataField(
    metadata: Record<string, unknown> | undefined,
    key: string
  ): string | undefined {
    const value = metadata?.[key];
    return typeof value === 'string' ? value : undefined;
  }
}

export const eventBus = new EventBus();
export const inMemoryEventBus = eventBus;
