import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { NextFunction, Request, Response } from 'express';
import { createLogger } from '../logger/logger';

export interface TraceContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  causationId?: string;
}

export class TracingService {
  private sdk: NodeSDK;
  private tracer = trace.getTracer('maysar-platform');

  constructor(serviceName: string) {
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
      }),
      traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      }),
      instrumentations: [getNodeAutoInstrumentations()]
    });
  }

  start(): void {
    const logger = createLogger('TracingService', 'shared');
    this.sdk.start();
    logger.info(`Tracing initialized for ${this.sdk['_resource'].attributes[SemanticResourceAttributes.SERVICE_NAME]}`);
  }

  stop(): Promise<void> {
    return this.sdk.shutdown();
  }

  createSpan(name: string, parentContext?: TraceContext) {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'correlation.id': parentContext?.correlationId || uuidv4(),
        'causation.id': parentContext?.causationId
      }
    });

    return {
      span,
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      correlationId: parentContext?.correlationId || uuidv4()
    };
  }

  async executeWithSpan<T>(
    name: string,
    operation: (traceContext: TraceContext) => Promise<T>,
    parentContext?: TraceContext
  ): Promise<T> {
    const { span, traceId, spanId, correlationId } = this.createSpan(name, parentContext);

    const traceContext: TraceContext = {
      traceId,
      spanId,
      correlationId,
      causationId: parentContext?.correlationId
    };

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () =>
        operation(traceContext)
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  addEventAttributes(span: Span, eventType: string, eventId: string, correlationId: string): void {
    span.setAttributes({
      'event.type': eventType,
      'event.id': eventId,
      'correlation.id': correlationId
    });
  }
}

// Correlation ID middleware for Express
export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(requestHeader)
      ? requestHeader[0]
      : requestHeader || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  };
}

// Global tracing service instance
export const tracingService = new TracingService(
  process.env.SERVICE_NAME || 'maysar-service'
);
