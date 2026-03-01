import express from 'express';
import cors from 'cors';
import { Container } from './infrastructure/container';
import { createTrainingRoutes } from './api/routes/training.routes';
import { createModuleRoutes } from './api/routes/module.routes';
import { createHealthRoutes } from './api/routes/health.routes';
import { correlationIdMiddleware } from './api/middleware/correlation-id.middleware';
import { errorHandlerMiddleware } from './api/middleware/error-handler.middleware';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

export function createApp() {
    const app = express();
    const container = Container.getInstance();

    app.use(express.json());
    app.use(cors());
    app.use(correlationMiddleware());
    app.use(correlationIdMiddleware);

    // Prometheus metrics
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    app.use('/api/v1/training', createTrainingRoutes(container.trainingController));
    app.use('/api/v1/modules', createModuleRoutes(container.moduleController));
    app.use('/api/health', createHealthRoutes(container.healthController));

    app.use(errorHandlerMiddleware);

    return app;
}
