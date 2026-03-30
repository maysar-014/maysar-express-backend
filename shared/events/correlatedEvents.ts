import { EventEnvelope } from './eventBus';
import { v4 as uuidv4 } from 'uuid';
import { tracingService, TraceContext } from '../tracing/openTelemetry';

export interface CorrelatedEventEnvelope extends EventEnvelope {
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
  ): CorrelatedEventEnvelope {
    const correlationId = context?.correlationId || context?.traceContext?.correlationId || uuidv4();
    const eventId = uuidv4();
    const timestamp = new Date();
    const producer = process.env.SERVICE_NAME || 'unknown-service';
    const version = 'v1';
    
    return {
      eventType,
      data: payload,
      eventId,
      correlationId,
      causationId: context?.causationId,
      traceId: context?.traceContext?.traceId,
      spanId: context?.traceContext?.spanId,
      timestamp,
      metadata: {
        eventId,
        timestamp: timestamp.toISOString(),
        correlationId,
        causationId: context?.causationId,
        traceId: context?.traceContext?.traceId,
        spanId: context?.traceContext?.spanId,
        producer,
        version
      }
    };
  }

  static propagateCorrelation<T>(
    sourceEvent: CorrelatedEventEnvelope,
    newEventType: string,
    newPayload: T
  ): CorrelatedEventEnvelope {
    return this.createCorrelatedEvent(newEventType, newPayload, {
      correlationId: sourceEvent.correlationId || '',
      causationId: sourceEvent.eventId,
      traceContext: {
        traceId: sourceEvent.traceId || '',
        spanId: sourceEvent.spanId || '',
        correlationId: sourceEvent.correlationId || ''
      }
    });
  }

  static async publishWithTracing<T>(
    eventType: string,
    payload: T,
    publisher: (event: CorrelatedEventEnvelope) => Promise<void>,
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
    const correlationId = event.correlationId || '';
    const eventId = event.eventId || '';
    const eventType = event.eventType || event.type || event.event || 'unknown';
    const causationIdValue = event.metadata?.causationId;
    const causationId = typeof causationIdValue === 'string' ? causationIdValue : undefined;
    const timestampValue = event.metadata?.timestamp;
    const timestamp = typeof timestampValue === 'string' ? timestampValue : new Date().toISOString();
    
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
      eventId: eventId || '',
      eventType,
      causationId: causationId || event.causationId,
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
