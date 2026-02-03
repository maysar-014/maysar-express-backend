/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createPaymentRoutes } from './api/routes/payment.routes';
import { Container } from './container';
import { config } from './config/config';

export function createApp(): Express {
    const app = express();
    const container = Container.getInstance();

    // Initialize Saga Subscriptions
    container.sagaEventHandler.setupSubscriptions().catch(err => {
        console.error('Failed to setup saga subscriptions:', err);
    });

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(morgan('combined'));

    // Health Check
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'UP', service: 'payment-service' });
    });

    // Routes
    app.use('/api/payments', createPaymentRoutes(container.paymentController));

    // Error Handling
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error('Unhandled Error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: config.env === 'development' ? err.message : undefined,
        });
    });

    return app;
}
