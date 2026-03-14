import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { setupExpressErrorHandler } from '@sentry/node';
import { moduleRegistry } from './core/module-registry';
import { prisma } from './config/prisma';
import { correlationMiddleware } from '../shared/tracing/openTelemetry';
import { appLogger } from '../shared/logger/logger';
import { requestLoggingMiddleware, performanceMonitoringMiddleware} from '../services/order-service/src/middleware/logging.middleware';
import { i18next, i18nextMiddleware } from '../shared/i18n/i18n';
import { csrfTokenMiddleware } from '../shared/middleware/csrf.middleware';
import { pingSharedRedis } from '../shared/redis/ioredis-client';

export const createApp = () => {
    const app = express();

    // Global Middleware
    app.use(correlationMiddleware());
    app.use(i18nextMiddleware.handle(i18next));
    const corsOrigin = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : false;
    app.use(cors({ origin: corsOrigin }));
    app.use(helmet());
    app.use(compression());
    app.use(requestLoggingMiddleware);
    app.use(performanceMonitoringMiddleware);
    app.use(cookieParser());
    app.use(csrfTokenMiddleware);
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
            const redisOk = await pingSharedRedis(process.env.REDIS_URL || 'redis://redis:6379');
            if (!redisOk) {
                throw new Error('redis ping failed');
            }
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

    // Sentry test endpoint
    app.get('/debug-sentry', (_req, _res) => {
        throw new Error('My first Sentry error!');
    });

    // Sentry error handler (before global error handler)
    if (process.env.SENTRY_DSN) {
        setupExpressErrorHandler(app);
    }

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
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
};
