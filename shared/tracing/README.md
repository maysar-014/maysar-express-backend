# shared/tracing

OpenTelemetry distributed tracing with Jaeger export and Express correlation ID middleware.

## Purpose

Provides `TracingService` for creating and managing OpenTelemetry spans, and `correlationMiddleware` for propagating correlation IDs through HTTP requests. Traces are exported to Jaeger for visualization.

## Exports

| Export | Description |
|--------|-------------|
| `TracingService` | Manages the OTel SDK, creates spans, executes operations within spans |
| `tracingService` | Singleton `TracingService` instance |
| `correlationMiddleware()` | Express middleware — reads/generates `X-Correlation-ID` header |
| `TraceContext` | `{ traceId, spanId, correlationId, causationId? }` |

## Usage

```typescript
import { tracingService, correlationMiddleware } from '@shared/tracing/openTelemetry';

// Mount correlation middleware
app.use(correlationMiddleware());

// Execute operation within a span
const result = await tracingService.executeWithSpan(
  'ProcessPayment',
  async (traceContext) => {
    // traceContext.correlationId is available here
    return await paymentGateway.charge(amount);
  },
  parentContext
);

// Start tracing on app boot
tracingService.start();

// Graceful shutdown
await tracingService.stop();
```

## Correlation ID Flow

The `correlationMiddleware` reads `X-Correlation-ID` from incoming requests (or generates a new UUID) and:
1. Sets `req.correlationId` for use in handlers
2. Echoes it back in the response `X-Correlation-ID` header

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `JAEGER_ENDPOINT` | `http://localhost:14268/api/traces` | Jaeger collector endpoint |
| `SERVICE_NAME` | `maysar-service` | OTel service name attribute |
| `SERVICE_VERSION` | `1.0.0` | OTel service version attribute |
| `NODE_ENV` | `development` | OTel deployment environment attribute |

## Dependencies

- `@opentelemetry/sdk-node` — OTel Node.js SDK
- `@opentelemetry/exporter-jaeger` — Jaeger trace exporter
- `@opentelemetry/auto-instrumentations-node` — Auto-instrumentation for Express, HTTP, etc.
- `@opentelemetry/api` — Span and context APIs
