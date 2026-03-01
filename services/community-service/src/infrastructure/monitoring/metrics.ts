import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';

const serviceName = 'community-service';

// Standard metrics from factory
export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export { metricsRegistry };
// Re-export metricsRegistry as 'register' for backwards compatibility
export { metricsRegistry as register };
export default metrics;
