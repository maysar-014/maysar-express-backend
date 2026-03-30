import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createBusinessRoutes, createLegacyBusinessRoutes, createPublicBusinessRoutes } from './src/api/routes/business.routes';
import { createHealthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { errorMiddleware } from './src/api/middleware/error.middleware';

export const BusinessRegistryModule: Module = {
    name: 'business-registry-service',
    initialize: async () => {
        console.log('Initializing business-registry-service module');
    },
    routes: (() => {
        const router = Router();
        router.use('/health', createHealthRoutes());
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        router.use('/public', createPublicBusinessRoutes());
        router.use('/businesses', createBusinessRoutes());
        router.use('/', createLegacyBusinessRoutes());
        router.use(errorMiddleware);
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down business-registry-service module');
    }
};


