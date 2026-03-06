import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter } from 'prom-client';

const serviceName = 'payment-service';

// Standard metrics from factory
export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

// Service-specific business metrics
export const businessMetrics = {
    paymentsProcessedTotal: new Counter({
        name: 'payment_service_payments_processed_total',
        help: 'Total number of payments processed',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    paymentFraudAssessmentsTotal: new Counter({
        name: 'payment_service_payment_fraud_assessments_total',
        help: 'Total number of fraud assessments performed',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    refundsTotal: new Counter({
        name: 'payment_service_refunds_total',
        help: 'Total number of refunds processed',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    paymentOutcomesTotal: new Counter({
        name: 'payment_service_payment_outcomes_total',
        help: 'Total payment outcomes by status',
        labelNames: ['status'],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
