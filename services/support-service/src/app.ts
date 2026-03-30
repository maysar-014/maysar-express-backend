import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export function createServer(container: Container) {
    const configureApp = (app: express.Application) => {
        app.use(correlationMiddleware());
        app.use(express.json());

        // Prometheus metrics
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        app.use('/api/v1/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
    };

    if (process.env.NODE_ENV === 'test') {
        const app = express();
        configureApp(app);
        return app;
    }

    const server = new InversifyExpressServer(container);

    server.setConfig(configureApp);

    try {
        return server.build();
    } catch (error) {
        if (error instanceof Error && error.message.includes('No controllers have been found')) {
            const app = express();
            configureApp(app);
            return app;
        }
        throw error;
    }
}


