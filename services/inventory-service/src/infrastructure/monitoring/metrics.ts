import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'inventory-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    stockReservationsTotal: new Counter({
        name: 'inventory_service_stock_reservations_total',
        help: 'Total number of stock reservations',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    stockAdjustmentsTotal: new Counter({
        name: 'inventory_service_stock_adjustments_total',
        help: 'Total number of stock adjustments',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    outOfStockEventsTotal: new Counter({
        name: 'inventory_service_out_of_stock_events_total',
        help: 'Total number of out-of-stock events',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
