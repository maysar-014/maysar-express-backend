import './async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { setupExpressErrorHandler } from '@sentry/node';
import { moduleRegistry, resolveModuleMountPath } from './core/module-registry';
import { prisma } from './config/prisma';
import { correlationMiddleware } from '../shared/tracing/openTelemetry';
import { appLogger } from '../shared/logger/logger';
import { createTrustedCorsOptions } from '../shared/utils/cors';
import { requestLoggingMiddleware, performanceMonitoringMiddleware} from '../services/order-service/src/middleware/logging.middleware';
import { i18next, i18nextMiddleware } from '../shared/i18n/i18n';
import { csrfTokenMiddleware, getOrCreateCsrfToken } from '../shared/middleware/csrf.middleware';
import { pingSharedRedis } from '../shared/redis/ioredis-client';
import { attachAuthContext } from '../shared/middleware/auth-context.middleware';
import { rateLimitMiddleware, financialRateLimiter, generalRateLimiter } from './middleware/rate-limit';
import { idempotencyMiddleware } from './middleware/idempotency';
import { paginationMiddleware } from './middleware/pagination';
import { dataloaderMiddleware } from './middleware/dataloader';
import { getPaymentBreakerHealth, isPaymentGatewayAvailable } from './lib/payment-circuit-breaker';
import { methodNotAllowedMiddleware } from '../shared/middleware/method-not-allowed.middleware';
import { globalErrorHandler, notFoundHandler } from '../shared/middleware/global-error-handler.middleware';

export const createApp = () => {
    const app = express();

    // Global Middleware
    app.use(correlationMiddleware());
    app.use(i18nextMiddleware.handle(i18next));
    app.use(cors(createTrustedCorsOptions()));
    app.use(helmet());
    app.use(compression());
    app.use(requestLoggingMiddleware);
    app.use(performanceMonitoringMiddleware);
    app.use(cookieParser());

    // Catch URIError thrown by Express router when path params contain invalid percent-encoding.
    // Must be registered before routes so it intercepts the error before Express sends an empty 400.
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof URIError) {
            res.status(400).json({ error: 'Bad Request', message: 'Invalid request path' });
            return;
        }
        next(err);
    });

    // Reject non-standard methods early to avoid parser-level failures on unknown verbs.
    const supportedMethods = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']);
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            const method = req.method.toUpperCase();
            if (!supportedMethods.has(method)) {
                res.set('Allow', 'DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT');
                res.status(405).json({ error: 'Method Not Allowed' });
                return;
            }
        }
        next();
    });

    app.use(attachAuthContext);
    app.use(csrfTokenMiddleware);

    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Normalize malformed JSON / URI parse failures into stable JSON responses.
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        const bodyParserError = err as { type?: string; status?: number; message?: string };
        if (bodyParserError?.type === 'entity.parse.failed') {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid JSON payload'
            });
            return;
        }

        if (err instanceof URIError || (bodyParserError as any)?.status === 400) {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid request path'
            });
            return;
        }

        next(err);
    });

    // CSRF token endpoint (useful for automated tests and non-browser clients)
    app.get('/csrf', (req, res) => {
        const token = getOrCreateCsrfToken(req, res);
        res.set('X-CSRF-Token', token);
        res.set('Cache-Control', 'no-store');
        res.json({ csrfToken: token });
    });

    // Rate limiting — applies per Article 11.10 (rate limits and resource protections)
    // Financial endpoints: 10 req/min; General API: 100 req/min
    app.use(rateLimitMiddleware);

    // Idempotency — applies per Article 11.11 (idempotent execution) and Article 18
    // (Financial and Transactional Integrity — prevent duplicate charges/orders/credits/debits)
    // Caches responses for state-changing requests with Idempotency-Key header for 24 hours
    app.use(idempotencyMiddleware);

    // Pagination — applies per Article 10.2 (query result boundaries) and Article 11.1
    // (Return only necessary response information). Default: page=1, limit=20, max=100
    app.use(paginationMiddleware);

    // DataLoader — applies per Article 10.3 (N+1 query elimination)
    // Creates per-request DataLoader instances for batched loading of related records
    app.use(dataloaderMiddleware);

    // Register module routes
    const modules = moduleRegistry.getModules();
    modules.forEach(module => {
        // Mount routes: /api/{service-name} (stripping '-service')
        const routePath = resolveModuleMountPath(module.name);

        if (module.routes) {
            app.use(routePath, module.routes);
            appLogger.info(`Mounted routes for ${module.name} at ${routePath}`);
        }

        if (module.routeAliases?.length) {
            module.routeAliases.forEach((alias) => {
                app.use(alias.path, alias.router);
                appLogger.info(`Mounted alias routes for ${module.name} at ${alias.path}`);
            });
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

    // Readiness Check - Checks dependencies (DB, Redis) and module health
    app.get('/ready', async (req, res) => {
        const checks: Record<string, string | object> = {};
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

        // Check module health per Article 19 (Failure Isolation) and Article 26 (Failure Handling)
        const moduleHealth = moduleRegistry.getModuleHealth();
        checks.modules = moduleHealth;
        const allModulesHealthy = Object.values(moduleHealth).every((h) => h === 'healthy');
        if (!allModulesHealthy) {
            isReady = false;
            appLogger.error('Readiness check failed: one or more modules are unhealthy', moduleHealth);
        }

        if (isReady) {
            res.json({ status: 'ready', checks });
        } else {
            res.status(503).json({ status: 'not ready', checks });
        }
    });

    // Payment Gateway Health Check - Circuit breaker status per Article 19
    app.get('/health/payment-gateway', (_req, res) => {
        const health = getPaymentBreakerHealth();
        const available = isPaymentGatewayAvailable();

        res.status(available ? 200 : 503).json({
            success: available,
            service: 'payment-gateway',
            circuitBreaker: health,
            timestamp: new Date().toISOString(),
        });
    });

    // Sentry test endpoint (disabled unless explicitly enabled)
    app.get('/debug-sentry', (_req, res) => {
        if (process.env.ENABLE_SENTRY_TEST === 'true') {
            throw new Error('My first Sentry error!');
        }
        res.status(200).json({ status: 'disabled' });
    });

    // Sentry error handler (before global error handler)
    if (process.env.SENTRY_DSN) {
        setupExpressErrorHandler(app);
    }

    // 405 Handler (registered routes with unsupported methods)
    app.use(methodNotAllowedMiddleware);

    // Global Error Handler — canonical JSON error shape for all services
    app.use(globalErrorHandler);

    // 404 Handler — after all routes and error handler
    app.use(notFoundHandler);

    return app;
};
