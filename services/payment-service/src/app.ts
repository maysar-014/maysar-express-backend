/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createPaymentRoutes } from './api/routes/payment.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { Container } from './container';

export function createApp(): Express {
    const app = express();
    const container = Container.getInstance();

    // Initialize Saga Subscriptions
    container.sagaEventHandler.setupSubscriptions().catch((err: Error) => {
        console.error('Failed to setup saga subscriptions:', err);
    });

    container.paymentEventHandlers.registerHandlers();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Health Check
    app.use('/health', healthRoutes);

    // Routes
    app.use('/api/payments', createPaymentRoutes(container.paymentController));

    // Error Handling
    app.use(errorHandler);

    return app;
}
