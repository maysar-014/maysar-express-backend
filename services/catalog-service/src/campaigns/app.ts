import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { metricsRegistry } from '../infrastructure/monitoring/metrics';

export function createServer(container: Container) {
    const server = new InversifyExpressServer(container);

    server.setConfig((app) => {
        app.use(express.json());
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
    });

    return server.build();
}
