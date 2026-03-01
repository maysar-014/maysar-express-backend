import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { tracingService, correlationMiddleware } from '../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';

// Initialize Tracing
tracingService.start();

export const ComplianceModule: Module = {
    name: 'compliance-service',
    initialize: async () => {
        console.log('Initializing compliance-service module');
    },
    routes: (() => {
        const router = Router();
        router.use(correlationMiddleware());
        router.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down compliance-service module');
    }
};
