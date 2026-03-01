const fs = require('fs');
const path = require('path');

const services = [
    { name: 'payment-service', metric: 'payment_service_payments_processed_total' },
    { name: 'wallet-service', metric: 'wallet_service_debits_total' },
    { name: 'inventory-service', metric: 'inventory_service_stock_reservations_total' },
    { name: 'logistics-service', metric: 'logistics_service_deliveries_total' },
    { name: 'catalog-service', metric: 'catalog_service_product_searches_total' },
    { name: 'auth-service', metric: 'auth_service_login_attempts_total' },
    { name: 'user-service', metric: 'user_service_user_registrations_total' }
];

services.forEach(svc => {
    const dir = path.join('C:/Users/abdal/Desktop/maysar-express-backend/services', svc.name, 'tests/infrastructure/monitoring');
    fs.mkdirSync(dir, { recursive: true });

    const content = `import { metricsRegistry } from '../../../../src/infrastructure/monitoring/metrics';

describe('${svc.name} Metrics Integration', () => {
    it('should expose saga, outbox, and business metrics on the /metrics registry', async () => {
        const metricsOutput = await metricsRegistry.metrics();
        
        // Assert business metric exists
        expect(metricsOutput).toContain('${svc.metric}'); 
        
        // Assert saga metric exists
        expect(metricsOutput).toContain('saga_step_duration_seconds');
        
        // Assert outbox metric exists
        expect(metricsOutput).toContain('outbox_events_published_total');
    });
});
`;
    const file = path.join(dir, 'metrics.integration.test.ts');
    fs.writeFileSync(file, content);
    console.log('Created ' + file);
});
