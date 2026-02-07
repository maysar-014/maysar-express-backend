import 'dotenv/config';
import 'reflect-metadata';
import '../shared/tracing/openTelemetry'; // Enable OpenTelemetry Tracing
import { createApp } from './app';
import { moduleRegistry } from './core/module-registry';
import { validateEnv } from './config/env-validation';
// @ts-ignore - Importing from virtual module alias or relative path
import * as services from '../services';

async function bootstrap() {
    try {
        validateEnv();
        console.log('Starting Maysar Express Backend Monolith...');

        // Auto-register all services imported from services/index
        Object.values(services).forEach((serviceModule: any) => {
            if (serviceModule && serviceModule.name && serviceModule.initialize) {
                moduleRegistry.register(serviceModule);
            }
        });

        // Initialize all modules
        await moduleRegistry.initializeAll();

        // Create and start app
        const app = createApp();
        const port = process.env.PORT || 3000;

        const server = app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
            console.log(`Health check available at http://localhost:${port}/health`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('Received shutdown signal');
            server.close(() => {
                console.log('HTTP server closed');
            });
            await moduleRegistry.shutdownAll();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to bootstrap application:', error);
        process.exit(1);
    }
}

bootstrap();
