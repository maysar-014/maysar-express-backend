import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { initializeEventRegistry } from '../../shared/events/registry';
import { createUserRoutes } from './src/api/routes/user.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export const UserModule: Module = {
    name: 'user-service',
    initialize: async () => {
        logger.info('Initializing user-service module');
        initializeEventRegistry();
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        try {
            router.use('/', createUserRoutes());
        } catch (error) {
            logger.warn('Failed to mount user routes, falling back to degraded handler:', error);
            router.all('/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'User routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }
        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down user-service module');
    }
};


