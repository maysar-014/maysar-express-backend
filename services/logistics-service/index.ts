import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';

export const LogisticsModule: Module = {
    name: 'logistics-service',
    initialize: async () => {
        logger.info('Initializing logistics-service module');
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', createMaintenanceRoutes());

        try {
            // Lazy load to avoid env-dependent side effects during module import
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const logisticsRoutes = require('./src/api/routes/logistics.routes').default;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const courierRoutes = require('./src/api/routes/courier.routes').default;

            router.use('/api/v1', logisticsRoutes);
            router.use('/api/courier', courierRoutes);
        } catch (error) {
            logger.warn('Failed to mount logistics routes, falling back to degraded handler:', error);
            router.all('/api/v1/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Logistics routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }

        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down logistics-service module');
    }
};
