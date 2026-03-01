import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'logistics-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    deliveriesTotal: new Counter({
        name: 'logistics_service_deliveries_total',
        help: 'Total number of deliveries',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    routeOptimizationsTotal: new Counter({
        name: 'logistics_service_route_optimizations_total',
        help: 'Total number of route optimizations',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    courierAssignmentsTotal: new Counter({
        name: 'logistics_service_courier_assignments_total',
        help: 'Total number of courier assignments',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
