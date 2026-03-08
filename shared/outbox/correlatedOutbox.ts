import { TransactionalOutbox } from './outboxPattern';
import { CorrelatedEventEnvelope, EventCorrelationService } from '../events/correlatedEvents';
import { tracingService, TraceContext } from '../tracing/openTelemetry';
import { PrismaClient } from '@prisma/client';
import type { PrismaTransaction } from '../types';

export class CorrelatedOutbox extends TransactionalOutbox {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async saveCorrelatedEvent(
    envelope: CorrelatedEventEnvelope,
    transaction?: PrismaClient | PrismaTransaction,
    traceContext?: TraceContext
  ): Promise<void> {
    await tracingService.executeWithSpan(
      `outbox-save-${envelope.eventType}`,
      async (spanContext) => {
        // Add tracing attributes to event
        const enhancedEnvelope = {
          ...envelope,
          traceId: traceContext?.traceId || spanContext.traceId,
          spanId: traceContext?.spanId || spanContext.spanId
        };

        await this.saveEvent(enhancedEnvelope, transaction);
      },
      traceContext
    );
  }

  async createAndSaveEvent<T>(
    eventType: string,
    payload: T,
    transaction?: PrismaClient | PrismaTransaction,
    context?: {
      correlationId?: string;
      causationId?: string;
      traceContext?: TraceContext;
    }
  ): Promise<CorrelatedEventEnvelope> {
    return await tracingService.executeWithSpan(
      `create-event-${eventType}`,
      async (spanContext) => {
        const event = EventCorrelationService.createCorrelatedEvent(
          eventType,
          payload,
          {
            ...context,
            traceContext: context?.traceContext || spanContext
          }
        );

        await this.saveCorrelatedEvent(event, transaction, spanContext);
        return event;
      },
      context?.traceContext
    );
  }
}
