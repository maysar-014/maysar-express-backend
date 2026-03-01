import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'catalog-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    productSearchesTotal: new Counter({
        name: 'catalog_service_product_searches_total',
        help: 'Total number of product searches',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    buyBoxWinsTotal: new Counter({
        name: 'catalog_service_buy_box_wins_total',
        help: 'Total number of buy box wins recorded',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    matchingRequestsTotal: new Counter({
        name: 'catalog_service_matching_requests_total',
        help: 'Total number of product matching requests',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
