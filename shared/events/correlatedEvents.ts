import { EventEnvelope } from '../../events';
import { v4 as uuidv4 } from 'uuid';
import { tracingService, TraceContext } from '../tracing/openTelemetry';

export interface CorrelatedEventEnvelope<T = any> extends EventEnvelope<T> {
  correlationId: string;
  causationId?: string;
  traceId?: string;
  spanId?: string;
}

export class EventCorrelationService {
  static createCorrelatedEvent<T>(
    eventType: string,
    payload: T,
    context?: {
      correlationId?: string;
      causationId?: string;
      traceContext?: TraceContext;
    }
  ): CorrelatedEventEnvelope<T> {
    const correlationId = context?.correlationId || uuidv4();
    
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      correlationId,
      causationId: context?.causationId,
      traceId: context?.traceContext?.traceId,
      spanId: context?.traceContext?.spanId,
      producer: process.env.SERVICE_NAME || 'unknown-service',
      version: 'v1',
      payload
    };
  }

  static propagateCorrelation<T>(
    sourceEvent: CorrelatedEventEnvelope,
    newEventType: string,
    newPayload: T
  ): CorrelatedEventEnvelope<T> {
    return this.createCorrelatedEvent(newEventType, newPayload, {
      correlationId: sourceEvent.correlationId,
      causationId: sourceEvent.eventId,
      traceContext: {
        traceId: sourceEvent.traceId || '',
        spanId: sourceEvent.spanId || '',
        correlationId: sourceEvent.correlationId
      }
    });
  }

  static async publishWithTracing<T>(
    eventType: string,
    payload: T,
    publisher: (event: CorrelatedEventEnvelope<T>) => Promise<void>,
    context?: TraceContext
  ): Promise<void> {
    await tracingService.executeWithSpan(
      `publish-${eventType}`,
      async (traceContext) => {
        const event = this.createCorrelatedEvent(eventType, payload, {
          correlationId: context?.correlationId || traceContext.correlationId,
          causationId: context?.causationId,
          traceContext
        });

        await publisher(event);
      },
      context
    );
  }
}

// Event chain tracker for saga monitoring
export class EventChainTracker {
  private chains = new Map<string, EventChainInfo>();

  addEvent(event: CorrelatedEventEnvelope): void {
    const { correlationId, eventId, eventType, causationId, timestamp } = event;
    
    if (!this.chains.has(correlationId)) {
      this.chains.set(correlationId, {
        correlationId,
        events: [],
        startTime: timestamp,
        lastEventTime: timestamp
      });
    }

    const chain = this.chains.get(correlationId)!;
    chain.events.push({
      eventId,
      eventType,
      causationId,
      timestamp,
      traceId: event.traceId,
      spanId: event.spanId
    });
    chain.lastEventTime = timestamp;
  }

  getChain(correlationId: string): EventChainInfo | undefined {
    return this.chains.get(correlationId);
  }

  getActiveChains(): EventChainInfo[] {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    return Array.from(this.chains.values())
      .filter(chain => new Date(chain.lastEventTime) > cutoff);
  }
}

interface EventChainInfo {
  correlationId: string;
  events: Array<{
    eventId: string;
    eventType: string;
    causationId?: string;
    timestamp: string;
    traceId?: string;
    spanId?: string;
  }>;
  startTime: string;
  lastEventTime: string;
}

export const eventChainTracker = new EventChainTracker();