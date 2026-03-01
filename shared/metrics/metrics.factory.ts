import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram, Summary } from 'prom-client';

export const metricsRegistry = new Registry();

export function createServiceMetrics(serviceName: string) {
    const prefix = `${serviceName.replace(/-/g, '_')}_`;

    // Enable default metrics collection once per process
    collectDefaultMetrics({ prefix, register: metricsRegistry });

    return {
        // HTTP Request metrics
        httpRequestsTotal: new Counter({
            name: `${prefix}http_requests_total`,
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [metricsRegistry]
        }),

        httpRequestDuration: new Histogram({
            name: `${prefix}http_request_duration_seconds`,
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
            registers: [metricsRegistry]
        }),

        // Database metrics
        databaseConnectionsTotal: new Gauge({
            name: `${prefix}database_connections_total`,
            help: 'Total number of database connections',
            labelNames: ['type'],
            registers: [metricsRegistry]
        }),

        databaseQueryDuration: new Histogram({
            name: `${prefix}database_query_duration_seconds`,
            help: 'Duration of database queries in seconds',
            labelNames: ['operation', 'table'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [metricsRegistry]
        }),

        databaseErrorsTotal: new Counter({
            name: `${prefix}database_errors_total`,
            help: 'Total number of database errors',
            labelNames: ['operation', 'table', 'error_type'],
            registers: [metricsRegistry]
        }),

        // External service metrics
        externalRequestsTotal: new Counter({
            name: `${prefix}external_requests_total`,
            help: 'Total number of external service requests',
            labelNames: ['service', 'operation', 'status'],
            registers: [metricsRegistry]
        }),

        externalRequestDuration: new Histogram({
            name: `${prefix}external_request_duration_seconds`,
            help: 'Duration of external service requests in seconds',
            labelNames: ['service', 'operation'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
            registers: [metricsRegistry]
        }),

        // Error metrics
        errorsTotal: new Counter({
            name: `${prefix}errors_total`,
            help: 'Total number of errors',
            labelNames: ['type', 'severity', 'component'],
            registers: [metricsRegistry]
        }),

        // Performance metrics
        memoryUsage: new Gauge({
            name: `${prefix}memory_usage_bytes`,
            help: 'Memory usage in bytes',
            labelNames: ['type'],
            registers: [metricsRegistry]
        }),

        eventLoopLag: new Gauge({
            name: `${prefix}event_loop_lag_seconds`,
            help: 'Event loop lag in seconds',
            registers: [metricsRegistry]
        }),

        // Circuit breaker metrics
        circuitBreakerState: new Gauge({
            name: `${prefix}circuit_breaker_state`,
            help: 'Circuit breaker state (0=closed, 1=open, 2=half_open)',
            labelNames: ['name'],
            registers: [metricsRegistry]
        }),

        circuitBreakerRequestsTotal: new Counter({
            name: `${prefix}circuit_breaker_requests_total`,
            help: 'Total number of circuit breaker requests',
            labelNames: ['name', 'state'],
            registers: [metricsRegistry]
        }),

        // Retry metrics
        retriesTotal: new Counter({
            name: `${prefix}retries_total`,
            help: 'Total number of retry attempts',
            labelNames: ['operation', 'attempt', 'success'],
            registers: [metricsRegistry]
        }),

        // Security metrics
        rateLimitHitsTotal: new Counter({
            name: `${prefix}rate_limit_hits_total`,
            help: 'Total number of rate limit hits',
            labelNames: ['endpoint', 'ip'],
            registers: [metricsRegistry]
        }),

        authAttemptsTotal: new Counter({
            name: `${prefix}auth_attempts_total`,
            help: 'Total number of authentication attempts',
            labelNames: ['result'],
            registers: [metricsRegistry]
        }),

        // Health check metrics
        healthCheckStatus: new Gauge({
            name: `${prefix}health_check_status`,
            help: 'Health check status (1=healthy, 0=unhealthy)',
            labelNames: ['check'],
            registers: [metricsRegistry]
        }),

        healthCheckDuration: new Histogram({
            name: `${prefix}health_check_duration_seconds`,
            help: 'Duration of health checks in seconds',
            labelNames: ['check'],
            buckets: [0.1, 0.5, 1, 2, 5],
            registers: [metricsRegistry]
        }),
    };
}

export class MetricsCollector {
    private static instance: MetricsCollector;
    private collectionInterval?: NodeJS.Timeout;
    private metrics: any;

    private constructor(private serviceName: string, metrics: any) {
        this.metrics = metrics;
        this.startCollection();
    }

    static getInstance(serviceName: string, metrics?: any): MetricsCollector {
        if (!MetricsCollector.instance) {
            if (!metrics) {
                throw new Error('Metrics must be provided for the first initialization');
            }
            MetricsCollector.instance = new MetricsCollector(serviceName, metrics);
        }
        return MetricsCollector.instance;
    }

    private startCollection(): void {
        const isMetricsEnabled = process.env.METRICS_ENABLED === 'true';
        if (!isMetricsEnabled) return;

        this.collectionInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 10000);
    }

    private collectSystemMetrics(): void {
        const memUsage = process.memoryUsage();

        this.metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
        this.metrics.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
        this.metrics.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
        this.metrics.memoryUsage.set({ type: 'external' }, memUsage.external);

        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1e9;
            this.metrics.eventLoopLag.set(lag);
        });
    }

    recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
        this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
        this.metrics.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration / 1000);
    }

    recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean, errorType?: string): void {
        if (success) {
            this.metrics.databaseQueryDuration.observe({ operation, table }, duration / 1000);
        } else {
            this.metrics.databaseErrorsTotal.inc({ operation, table, error_type: errorType || 'unknown' });
        }
    }

    updateDatabaseConnections(type: string, count: number): void {
        this.metrics.databaseConnectionsTotal.set({ type }, count);
    }

    recordExternalRequest(service: string, operation: string, success: boolean, duration: number): void {
        const status = success ? 'success' : 'error';
        this.metrics.externalRequestsTotal.inc({ service, operation, status });
        this.metrics.externalRequestDuration.observe({ service, operation }, duration / 1000);
    }

    recordError(type: string, severity: string, component: string): void {
        this.metrics.errorsTotal.inc({ type, severity, component });
    }

    updateCircuitBreakerState(name: string, state: 'closed' | 'open' | 'half_open'): void {
        const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
        this.metrics.circuitBreakerState.set({ name }, stateValue);
    }

    recordCircuitBreakerRequest(name: string, state: string): void {
        this.metrics.circuitBreakerRequestsTotal.inc({ name, state });
    }

    recordRetry(operation: string, attempt: number, success: boolean): void {
        this.metrics.retriesTotal.inc({ operation, attempt: attempt.toString(), success: success.toString() });
    }

    recordRateLimitHit(endpoint: string, ip: string): void {
        this.metrics.rateLimitHitsTotal.inc({ endpoint, ip });
    }

    recordAuthAttempt(success: boolean): void {
        const result = success ? 'success' : 'failure';
        this.metrics.authAttemptsTotal.inc({ result });
    }

    recordHealthCheck(check: string, healthy: boolean, duration: number): void {
        this.metrics.healthCheckStatus.set({ check }, healthy ? 1 : 0);
        this.metrics.healthCheckDuration.observe({ check }, duration / 1000);
    }

    async getMetrics(): Promise<string> {
        return metricsRegistry.metrics();
    }

    reset(): void {
        metricsRegistry.clear();
    }

    destroy(): void {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
        }
    }
}

export function createMetricsCollector(serviceName: string, metrics: any): MetricsCollector {
    return MetricsCollector.getInstance(serviceName, metrics);
}

