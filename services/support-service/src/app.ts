import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';

export function createServer(container: Container) {
    const server = new InversifyExpressServer(container);

    server.setConfig((app) => {
        app.use(correlationMiddleware());
        app.use(express.json());

        // Prometheus metrics
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        app.use('/api/v1/system/maintenance', createMaintenanceRoutes());
    });

    return server.build();
}
