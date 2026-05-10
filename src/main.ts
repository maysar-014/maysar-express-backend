/* eslint-disable no-console */
import './tracing'; // MUST be first - before any other imports
import './instrument';
import 'dotenv/config';
import './config/normalize-database-url';
import 'reflect-metadata';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { moduleRegistry } from './core/module-registry';
import { validateEnv } from './config/env-validation';
import type { ServiceModule } from './core/module.interface';
import { createLogger } from '../shared/logger/logger';
import { serializeError } from '../shared/logger/error-utils';
import { initializeEventRegistry } from '../shared/events/registry';

const bootstrapLogger = createLogger('Bootstrap', 'core');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const baseUrl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

const writeJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
    const body = JSON.stringify(payload);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
};

let currentHandler: RequestHandler = (req, res) => {
    const url = req.url || '/';

    if (url === '/health') {
        writeJson(res, 200, {
            success: true,
            status: 'starting',
            message: 'Bootstrap in progress'
        });
        return;
    }

    if (url === '/ready') {
        writeJson(res, 503, {
            success: false,
            status: 'starting',
            message: 'Application modules are still initializing'
        });
        return;
    }

    writeJson(res, 503, {
        success: false,
        status: 'starting',
        message: 'Application bootstrap in progress'
    });
};

const server = createServer((req, res) => currentHandler(req, res));

console.log('[BOOTSTRAP] main.ts loaded');

async function bootstrap() {
    try {
        server.listen(port, host, () => {
            bootstrapLogger.info(`Bootstrap shell listening at ${baseUrl}`);
        });

        console.log('[BOOTSTRAP] validateEnv start');
        validateEnv();
        bootstrapLogger.info('Starting Maysar Express Backend Monolith...');

        // Initialize event registry before modules.
        initializeEventRegistry();

        // Defer the monolith service graph import until after the bootstrap shell
        // is already accepting requests on the port.
        const services = await import('../services');

        Object.values(services).forEach((serviceModule: ServiceModule) => {
            if (serviceModule && serviceModule.name && typeof serviceModule.initialize === 'function') {
                moduleRegistry.register(serviceModule);
            }
        });

        await moduleRegistry.initializeAll();

        const { createApp } = await import('./app');
        const app = createApp();
        currentHandler = app as unknown as RequestHandler;
        bootstrapLogger.info(`Server running at ${baseUrl}`);
        bootstrapLogger.info(`Health check available at ${baseUrl}/health`);
        bootstrapLogger.info(`Readiness probe at ${baseUrl}/ready`);

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
            const serializedReason = serializeError(reason);
            console.error('[FATAL] Unhandled Promise Rejection:', serializedReason);
            bootstrapLogger.error('Unhandled Promise Rejection', serializedReason);
            if (!keepAliveOnCrash) {
                void shutdown();
            }
        });

        process.on('uncaughtException', (error) => {
            const serializedError = serializeError(error);
            console.error('[FATAL] Uncaught Exception:', serializedError);
            bootstrapLogger.error('Uncaught Exception', serializedError);
            if (!keepAliveOnCrash) {
                void shutdown();
            }
        });
    } catch (error) {
        console.error('[FATAL] Failed to bootstrap application:', serializeError(error));
        bootstrapLogger.error('Failed to bootstrap application:', serializeError(error));
        process.exit(1);
    }
}

bootstrap();
