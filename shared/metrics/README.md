# shared/metrics

Prometheus metrics factory and `MetricsCollector` singleton for standardized observability across all service modules.

## Purpose

Provides a pre-built set of Prometheus metrics (HTTP, database, external services, errors, circuit breakers, retries, auth, health checks) that every service gets for free by calling `createServiceMetrics`. All metrics share a single `metricsRegistry` exposed at `/metrics`.

## Exports

| Export | Description |
|--------|-------------|
| `metricsRegistry` | Shared Prometheus `Registry` instance |
| `createServiceMetrics(serviceName)` | Creates a full set of labeled metrics for a service |
| `MetricsCollector` | Singleton that wraps metrics with convenience recording methods |
| `createMetricsCollector(serviceName, metrics)` | Factory for `MetricsCollector` |
| `ServiceMetrics` | TypeScript type for the metrics object |

## Usage

```typescript
import { createServiceMetrics, createMetricsCollector } from '@shared/metrics/metrics.factory';

const metrics = createServiceMetrics('payment-service');
const collector = createMetricsCollector('payment-service', metrics);

// Record HTTP request
collector.recordHttpRequest('POST', '/api/payments', 201, 45);

// Record database query
collector.recordDatabaseQuery('create', 'Payment_Payment', 12, true);

// Update circuit breaker state
collector.updateCircuitBreakerState('pesapal-gateway', 'open');

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await collector.getMetrics());
});
```

## Metrics Provided

| Metric | Type | Description |
|--------|------|-------------|
| `{prefix}_http_requests_total` | Counter | HTTP requests by method/route/status |
| `{prefix}_http_request_duration_seconds` | Histogram | Request latency |
| `{prefix}_database_query_duration_seconds` | Histogram | Query latency |
| `{prefix}_database_errors_total` | Counter | DB errors by operation/table/type |
| `{prefix}_external_requests_total` | Counter | External service calls |
| `{prefix}_errors_total` | Counter | Application errors by type/severity |
| `{prefix}_circuit_breaker_state` | Gauge | 0=closed, 1=open, 2=half_open |
| `{prefix}_retries_total` | Counter | Retry attempts |
| `{prefix}_auth_attempts_total` | Counter | Auth success/failure |
| `{prefix}_health_check_status` | Gauge | 1=healthy, 0=unhealthy |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `METRICS_ENABLED` | `false` | Enables system metrics collection interval |

## Dependencies

- `prom-client` — Prometheus client library
