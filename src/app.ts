import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { moduleRegistry } from './core/module-registry';
import { prisma } from './config/prisma';
import { correlationMiddleware } from '../shared/tracing/openTelemetry';
import { appLogger } from '../shared/logger/logger';
import { requestLoggingMiddleware, performanceMonitoringMiddleware, errorLoggingMiddleware } from '../services/order-service/src/middleware/logging.middleware';
import { requestLoggingMiddleware, performanceMonitoringMiddleware, errorLoggingMiddleware } from '../services/order-service/src/middleware/logging.middleware';

export const createApp = () => {
    const app = express();

    // Global Middleware
    app.use(correlationMiddleware());
    const corsOrigin = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : false;
    app.use(cors({ origin: corsOrigin }));
    app.use(helmet());
    app.use(compression());
    app.use(requestLoggingMiddleware);
    app.use(performanceMonitoringMiddleware);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Register module routes
    const modules = moduleRegistry.getModules();
    modules.forEach(module => {
        // Mount routes: /api/{service-name} (stripping '-service')
        const routeName = module.name.replace('-service', '');
        const routePath = `/api/${routeName}`;

        if (module.routes) {
            app.use(routePath, module.routes);
            appLogger.info(`Mounted routes for ${module.name} at ${routePath}`);
        }
    });

    // Health Check (Liveness) - Fast, checks if process is running
    app.get('/health', (req, res) => {
        const healthcheck = {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memoryUsage: process.memoryUsage(),
        };
        res.json(healthcheck);
    });

    // Readiness Check - Checks dependencies (DB, Redis)
    app.get('/ready', async (req, res) => {
        const checks: Record<string, string> = {};
        let isReady = true;

        // Check Database
        try {
            await prisma.$queryRaw`SELECT 1`;
            checks.database = 'connected';
        } catch (error) {
            checks.database = 'disconnected';
            isReady = false;
            appLogger.error('Readiness check failed (database):', error);
        }

        // Check Redis
        try {
            const Redis = await import('ioredis');
            // @ts-expect-error - Redis default export type issue
            const redis = new Redis.default(process.env.REDIS_URL || 'redis://redis:6379', {
                lazyConnect: true,
                connectTimeout: 2000,
                maxRetriesPerRequest: 1
            });
            await redis.connect();
            await redis.ping();
            await redis.quit();
            checks.redis = 'connected';
        } catch (error) {
            checks.redis = 'disconnected';
            isReady = false;
            appLogger.error('Readiness check failed (redis):', error);
        }

        if (isReady) {
            res.json({ status: 'ready', checks });
        } else {
            res.status(503).json({ status: 'not ready', checks });
        }
    });

    // Global Error Handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        appLogger.error('Global Error Handler', err);
        const status = (err as { status?: number; statusCode?: number }).status ?? (err as { status?: number; statusCode?: number }).statusCode ?? 500;
        const response: { error: string; message: string; stack?: string } = {
            error: 'Internal Server Error',
            message: err.message || 'An unexpected error occurred'
        };
        if (process.env.NODE_ENV !== 'production') {
            response.stack = err.stack;
        }
        res.status(status).json(response);
    });

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
};
