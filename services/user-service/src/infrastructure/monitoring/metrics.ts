import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'user-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    userRegistrationsTotal: new Counter({
        name: 'user_service_user_registrations_total',
        help: 'Total number of user registrations',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    profileUpdatesTotal: new Counter({
        name: 'user_service_profile_updates_total',
        help: 'Total number of profile updates',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    codReputationUpdatesTotal: new Counter({
        name: 'user_service_cod_reputation_updates_total',
        help: 'Total number of COD reputation updates',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
