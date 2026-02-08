const fs = require('fs');
const path = require('path');

const services = [
    'analytics-service',
    'auth-service',
    'business-registry-service',
    'campaign-service',
    'catalog-service',
    'checkout-service',
    'commission-service',
    'community-service',
    'compliance-service',
    'enabler-service',
    'inventory-service',
    'logistics-service',
    'maps-service',
    'notification-service',
    'order-service',
    'payment-service',
    'payout-service',
    'pricing-service',
    'production-service',
    'session-service',
    'sms-service',
    'support-service',
    'training-service',
    'two-factor-service',
    'user-service',
    'wallet-service'
];

const baseDir = path.join(__dirname, '../tests/setup');

if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

services.forEach(service => {
    const serviceDir = path.join(baseDir, service);

    if (!fs.existsSync(serviceDir)) {
        fs.mkdirSync(serviceDir, { recursive: true });
    }

    // Create directories
    ['factories', 'fixtures', 'mocks'].forEach(dir => {
        const dirPath = path.join(serviceDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            // Create a .gitkeep file to ensure directory persists
            fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
        }
    });

    // Create setup.ts
    const setupContent = `import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

// Global setup for ${service}
beforeAll(async () => {
  // Setup logic here
});

afterAll(async () => {
  // Teardown logic here
});
`;

    const setupPath = path.join(serviceDir, 'setup.ts');
    if (!fs.existsSync(setupPath)) {
        fs.writeFileSync(setupPath, setupContent);
        console.log(`Created ${setupPath}`);
    }

    // Create setup.integration.ts
    const setupIntegrationContent = `import 'reflect-metadata';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

// Integration test setup for ${service}
// This is where we would spin up containers if needed

beforeAll(async () => {
  // Start containers
});

afterAll(async () => {
  // Stop containers
});
`;

    const setupIntegrationPath = path.join(serviceDir, 'setup.integration.ts');
    if (!fs.existsSync(setupIntegrationPath)) {
        fs.writeFileSync(setupIntegrationPath, setupIntegrationContent);
        console.log(`Created ${setupIntegrationPath}`);
    }
});

console.log('Test setup generation complete.');
