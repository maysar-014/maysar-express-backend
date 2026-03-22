import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { healthRoutes } from './src/api/routes/health.routes';
import { DependencyContainer } from './src/infrastructure/container';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export const LogisticsModule: Module = {
    name: 'logistics-service',
    initialize: async () => {
        logger.info('Initializing logistics-service module');
        try {
            const container = DependencyContainer.getInstance();
            await container.initializeDatabaseConnections();
        } catch (error) {
            logger.warn('Logistics dependency initialization failed:', error);
        }
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

        try {
            // Lazy load to avoid env-dependent side effects during module import
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const logisticsRoutes = require('./src/api/routes/logistics.routes').default;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const courierRoutes = require('./src/api/routes/courier.routes').default;

            router.use('/api/v1', requireAuth, logisticsRoutes);
            router.use('/api/courier', requireAuth, courierRoutes);
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



