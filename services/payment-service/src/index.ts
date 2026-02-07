/**
 * Service Entry Point
 * Starts the HTTP server
 */

import { createApp } from './app';
import { config } from './config/config';
import { Container } from './container';

async function startServer() {
    const app = createApp();
    const container = Container.getInstance();

    // ...
    try {
        // Check database connection
        await container.prisma.$connect();
        console.log('✅ Connected to database');

        // Initialize Saga Event Handler subscriptions
        await container.sagaEventHandler.setupSubscriptions();
        console.log('✅ Saga subscriptions initialized');

        app.listen(config.port, () => {
            console.log(`🚀 Payment Service running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
        });
    } catch (error) {
        // ...
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
