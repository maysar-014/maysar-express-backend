/* eslint-disable no-console */
import './tracing'; // MUST be first — before any other imports
import './instrument';
import 'dotenv/config';
import './config/normalize-database-url';
import 'reflect-metadata';
import { createApp } from './app';
import { moduleRegistry } from './core/module-registry';
import { validateEnv } from './config/env-validation';
import { ServiceModule } from './core/module.interface';
import * as services from '../services';
import { createLogger } from '../shared/logger/logger';
import { initializeEventRegistry } from '../shared/events/registry';

const bootstrapLogger = createLogger('Bootstrap', 'core');

async function bootstrap() {
    try {
        validateEnv();
        bootstrapLogger.info('Starting Maysar Express Backend Monolith...');

        // Initialize event registry before modules
        initializeEventRegistry();

        // Auto-register all services imported from services/index
        Object.values(services).forEach((serviceModule: ServiceModule) => {
            if (serviceModule && serviceModule.name && typeof serviceModule.initialize === 'function') {
                moduleRegistry.register(serviceModule);
            }
        });

        // Initialize all modules
        await moduleRegistry.initializeAll();

        // Create and start app
        const app = createApp();
        const port = process.env.PORT || 3000;

        const server = app.listen(port, () => {
            bootstrapLogger.info(`Server running at http://localhost:${port}`);
            bootstrapLogger.info(`Health check available at http://localhost:${port}/health`);
            bootstrapLogger.info(`Readiness probe at http://localhost:${port}/ready`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            bootstrapLogger.info('Received shutdown signal');
            server.close(() => {
                bootstrapLogger.info('HTTP server closed');
            });
            await moduleRegistry.shutdownAll();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        bootstrapLogger.error('Failed to bootstrap application:', error);
        process.exit(1);
    }
}

bootstrap();
