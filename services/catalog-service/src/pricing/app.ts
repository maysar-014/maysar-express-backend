import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { metricsRegistry } from '../infrastructure/monitoring/metrics';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Health checks
    app.use('/health', healthRoutes);

    // TODO: Add pricing routes

    // Prometheus metrics
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    // Error handling
    app.use(errorHandler);

    return app;
}
