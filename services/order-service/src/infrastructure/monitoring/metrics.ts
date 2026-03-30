/**
 * Metrics Collection Infrastructure
 * Prometheus-compatible metrics collection for monitoring and alerting
 */

import { register, collectDefaultMetrics, Gauge, Counter, Histogram, Summary } from 'prom-client';
import { metricsConfig } from '../../config/monitoring.config';

// Enable default metrics collection outside test runs
if (metricsConfig.collectDefaultMetrics && process.env.NODE_ENV !== 'test') {
  collectDefaultMetrics({ prefix: 'order_service_' });
}

// Custom metrics
export const metrics = {
  // HTTP Request metrics
  httpRequestsTotal: new Counter({
    name: 'order_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  httpRequestDuration: new Histogram({
    name: 'order_service_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Database metrics
  databaseConnectionsTotal: new Gauge({
    name: 'order_service_database_connections_total',
    help: 'Total number of database connections',
    labelNames: ['type'], // prisma
  }),

  databaseQueryDuration: new Histogram({
    name: 'order_service_database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  databaseErrorsTotal: new Counter({
    name: 'order_service_database_errors_total',
    help: 'Total number of database errors',
    labelNames: ['operation', 'table', 'error_type'],
  }),

  // Business metrics
  ordersCreatedTotal: new Counter({
    name: 'order_service_orders_created_total',
    help: 'Total number of orders created',
    labelNames: ['status', 'payment_method'],
  }),

  ordersProcessedTotal: new Counter({
    name: 'order_service_orders_processed_total',
    help: 'Total number of orders processed',
    labelNames: ['status', 'processing_time'],
  }),

  paymentsProcessedTotal: new Counter({
    name: 'order_service_payments_processed_total',
    help: 'Total number of payments processed',
    labelNames: ['method', 'status', 'currency'],
  }),

  // External service metrics
  externalRequestsTotal: new Counter({
    name: 'order_service_external_requests_total',
    help: 'Total number of external service requests',
    labelNames: ['service', 'operation', 'status'],
  }),

  externalRequestDuration: new Histogram({
    name: 'order_service_external_request_duration_seconds',
    help: 'Duration of external service requests in seconds',
    labelNames: ['service', 'operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'order_service_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity', 'component'],
  }),

  // Performance metrics
  memoryUsage: new Gauge({
    name: 'order_service_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'], // rss, heapUsed, heapTotal, external
  }),

  eventLoopLag: new Gauge({
    name: 'order_service_event_loop_lag_seconds',
    help: 'Event loop lag in seconds',
  }),

  // Circuit breaker metrics
  circuitBreakerState: new Gauge({
    name: 'order_service_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half_open)',
    labelNames: ['name'],
  }),

  circuitBreakerRequestsTotal: new Counter({
    name: 'order_service_circuit_breaker_requests_total',
    help: 'Total number of circuit breaker requests',
    labelNames: ['name', 'state'],
  }),

  // Retry metrics
  retriesTotal: new Counter({
    name: 'order_service_retries_total',
    help: 'Total number of retry attempts',
    labelNames: ['operation', 'attempt', 'success'],
  }),

  // Security metrics
  rateLimitHitsTotal: new Counter({
    name: 'order_service_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint', 'ip'],
  }),

  authAttemptsTotal: new Counter({
    name: 'order_service_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['result'], // success, failure
  }),

  // Health check metrics
  healthCheckStatus: new Gauge({
    name: 'order_service_health_check_status',
    help: 'Health check status (1=healthy, 0=unhealthy)',
    labelNames: ['check'],
  }),

  healthCheckDuration: new Histogram({
    name: 'order_service_health_check_duration_seconds',
    help: 'Duration of health checks in seconds',
    labelNames: ['check'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
};

// Metrics collection utilities
export class MetricsCollector {
  private static instance: MetricsCollector;
  private collectionInterval?: NodeJS.Timeout;

  private constructor() {
    if (process.env.NODE_ENV !== 'test') {
      this.startCollection();
    }
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private startCollection(): void {
    // Collect system metrics every 10 seconds
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    metrics.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    metrics.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    metrics.memoryUsage.set({ type: 'external' }, memUsage.external);

    // Event loop lag (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e9;
      metrics.eventLoopLag.set(lag);
    });
  }

  // HTTP metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    metrics.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
  }

  // Database metrics
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean, errorType?: string): void {
    if (success) {
      metrics.databaseQueryDuration.observe({ operation, table }, duration / 1000);
    } else {
      metrics.databaseErrorsTotal.inc({ operation, table, error_type: errorType || 'unknown' });
    }
  }

  updateDatabaseConnections(type: string, count: number): void {
    metrics.databaseConnectionsTotal.set({ type }, count);
  }

  // Business metrics
  recordOrderCreated(status: string, paymentMethod: string): void {
    metrics.ordersCreatedTotal.inc({ status, payment_method: paymentMethod });
  }

  recordOrderProcessed(status: string, processingTime: number): void {
    metrics.ordersProcessedTotal.inc({ status, processing_time: processingTime.toString() });
  }

  recordPaymentProcessed(method: string, status: string, currency: string): void {
    metrics.paymentsProcessedTotal.inc({ method, status, currency });
  }

  // External service metrics
  recordExternalRequest(service: string, operation: string, success: boolean, duration: number): void {
    const status = success ? 'success' : 'error';
    metrics.externalRequestsTotal.inc({ service, operation, status });
    metrics.externalRequestDuration.observe({ service, operation }, duration / 1000);
  }

  // Error metrics
  recordError(type: string, severity: string, component: string): void {
    metrics.errorsTotal.inc({ type, severity, component });
  }

  // Circuit breaker metrics
  updateCircuitBreakerState(name: string, state: 'closed' | 'open' | 'half_open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    metrics.circuitBreakerState.set({ name }, stateValue);
  }

  recordCircuitBreakerRequest(name: string, state: string): void {
    metrics.circuitBreakerRequestsTotal.inc({ name, state });
  }

  // Retry metrics
  recordRetry(operation: string, attempt: number, success: boolean): void {
    metrics.retriesTotal.inc({ operation, attempt: attempt.toString(), success: success.toString() });
  }

  // Security metrics
  recordRateLimitHit(endpoint: string, ip: string): void {
    metrics.rateLimitHitsTotal.inc({ endpoint, ip });
  }

  recordAuthAttempt(success: boolean): void {
    const result = success ? 'success' : 'failure';
    metrics.authAttemptsTotal.inc({ result });
  }

  // Health check metrics
  recordHealthCheck(check: string, healthy: boolean, duration: number): void {
    metrics.healthCheckStatus.set({ check }, healthy ? 1 : 0);
    metrics.healthCheckDuration.observe({ check }, duration / 1000);
  }

  // Get metrics for monitoring
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Reset all metrics (for testing)
  reset(): void {
    register.clear();
  }

  // Cleanup
  destroy(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
  }
}

// Global metrics collector instance
export const metricsCollector = MetricsCollector.getInstance();

// Convenience functions
export function incrementHttpRequests(method: string, route: string, statusCode: number): void {
  metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
}

export function observeHttpRequestDuration(method: string, route: string, statusCode: number, duration: number): void {
  metrics.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
}

export function incrementErrors(type: string, severity: string, component: string): void {
  metrics.errorsTotal.inc({ type, severity, component });
}

export default metrics;

