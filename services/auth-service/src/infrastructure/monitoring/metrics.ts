import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '@shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'auth-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    loginAttemptsTotal: new Counter({
        name: 'auth_service_login_attempts_total',
        help: 'Total number of login attempts',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    tokenRefreshesTotal: new Counter({
        name: 'auth_service_token_refreshes_total',
        help: 'Total number of token refreshes',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    twoFaVerificationsTotal: new Counter({
        name: 'auth_service_2fa_verifications_total',
        help: 'Total number of 2FA verifications',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
