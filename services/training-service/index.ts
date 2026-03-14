import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createTrainingRoutes } from './src/api/routes/training.routes';
import { createModuleRoutes } from './src/api/routes/module.routes';
import { createHealthRoutes } from './src/api/routes/health.routes';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { Container } from './src/infrastructure/container';

export const TrainingModule: Module = {
    name: 'training-service',
    initialize: async () => {
        console.log('Initializing training-service module');
    },
    routes: (() => {
        const router = Router();
        const container = Container.getInstance();

        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        router.use('/api/v1/training', createTrainingRoutes(container.trainingController));
        router.use('/api/v1/modules', createModuleRoutes(container.moduleController));
        router.use('/api/health', createHealthRoutes(container.healthController));

        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down training-service module');
    }
};
