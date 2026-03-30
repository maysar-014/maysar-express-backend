import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

export function createServer(container: Container) {
    const fallback = () => {
        const app = express();
        app.use(correlationMiddleware());
        app.use(express.json());
        app.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
        return app;
    };

    if (process.env.NODE_ENV === 'test') {
        return fallback();
    }

    try {
        const server = new InversifyExpressServer(container);

        server.setConfig((app) => {
            app.use(correlationMiddleware());
            app.use(express.json());

            app.get('/metrics', async (_req, res) => {
                res.set('Content-Type', metricsRegistry.contentType);
                res.end(await metricsRegistry.metrics());
            });
        });

        return server.build();
    } catch (error) {
        if (error instanceof Error && error.message.includes('No controllers have been found')) {
            return fallback();
        }
        throw error;
    }
}
