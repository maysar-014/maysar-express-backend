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

        server.on('clientError', (error: NodeJS.ErrnoException, socket: import('net').Socket) => {
            bootstrapLogger.warn('HTTP client error', {
                code: error.code,
                message: error.message
            });

            if (!socket.writable) {
                socket.destroy();
                return;
            }

            const isInvalidMethod = error.code === 'HPE_INVALID_METHOD';
            const statusLine = isInvalidMethod
                ? 'HTTP/1.1 405 Method Not Allowed'
                : 'HTTP/1.1 400 Bad Request';
            const body = JSON.stringify({
                error: isInvalidMethod ? 'Method Not Allowed' : 'Bad Request',
                message: isInvalidMethod
                    ? 'Unsupported HTTP method'
                    : 'Malformed HTTP request'
            });

            socket.end(
                `${statusLine}\r\n`
                + 'Connection: close\r\n'
                + 'Content-Type: application/json\r\n'
                + `Content-Length: ${Buffer.byteLength(body)}\r\n`
                + '\r\n'
                + body
            );
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

        const keepAliveOnCrash = process.env.NODE_ENV !== 'production';

        process.on('unhandledRejection', (reason) => {
            bootstrapLogger.error('Unhandled Promise Rejection', reason as any);
            if (!keepAliveOnCrash) {
                void shutdown();
            }
        });

        process.on('uncaughtException', (error) => {
            bootstrapLogger.error('Uncaught Exception', error);
            if (!keepAliveOnCrash) {
                void shutdown();
            }
        });

    } catch (error) {
        bootstrapLogger.error('Failed to bootstrap application:', error);
        process.exit(1);
    }
}

bootstrap();
