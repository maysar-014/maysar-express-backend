import { createServiceMetrics, createMetricsCollector, metricsRegistry } from '../../../../../shared/metrics/metrics.factory';
import { Counter, Gauge } from 'prom-client';

const serviceName = 'wallet-service';

export const metrics = createServiceMetrics(serviceName);
export const metricsCollector = createMetricsCollector(serviceName, metrics);

export const businessMetrics = {
    walletDebitsTotal: new Counter({
        name: 'wallet_service_wallet_debits_total',
        help: 'Total number of wallet debits',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    walletCreditsTotal: new Counter({
        name: 'wallet_service_wallet_credits_total',
        help: 'Total number of wallet credits',
        labelNames: [],
        registers: [metricsRegistry]
    }),
    walletBalanceGauge: new Gauge({
        name: 'wallet_service_wallet_balance_gauge',
        help: 'Current balance in a wallet',
        labelNames: [],
        registers: [metricsRegistry]
    })
};

export { metricsRegistry };
export default metrics;

// Re-export metricsRegistry as register for backwards compatibility
export { metricsRegistry as register };
