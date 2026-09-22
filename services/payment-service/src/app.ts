/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { setupExpressErrorHandler } from '@sentry/node';
import { createPaymentRoutes } from './api/routes/payment.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { logger } from './infrastructure/services/logger.service';
import { Container } from './container';
import { i18next, i18nextMiddleware } from '@shared/i18n/i18n';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export function createApp(): Express {
    const app = express();
    const container = Container.getInstance();

    // Initialize Saga Subscriptions
    container.sagaEventHandler.setupSubscriptions().catch((err: Error) => {
        logger.error('Failed to setup saga subscriptions:', err);
    });

    container.paymentEventHandlers.registerHandlers();

    // Middleware
    app.use(correlationMiddleware());
    app.use(i18nextMiddleware.handle(i18next));
    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Health Check
    app.use('/health', healthRoutes);

    // Routes
    app.use('/api/payments', createPaymentRoutes(container.paymentController, container.paymentAdminController));
    app.use('/api/v1/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

    // Prometheus metrics
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    // Sentry test endpoint
    app.get('/debug-sentry', (req, res) => {
        throw new Error('Payment Service Sentry test error!');
    });

    // Sentry error handler (before error handler)
    if (process.env.SENTRY_DSN) {
        setupExpressErrorHandler(app);
    }

    // Error Handling
    app.use(errorHandler);

    return app;
}


