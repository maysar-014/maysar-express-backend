import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Health checks
    app.use('/health', healthRoutes);

    // TODO: Add pricing routes

    // Error handling
    app.use(errorHandler);

    return app;
}
