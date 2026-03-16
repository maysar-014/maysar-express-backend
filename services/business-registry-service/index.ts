import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createBusinessRoutes } from './src/api/routes/business.routes';
import { createHealthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';

export const BusinessRegistryModule: Module = {
    name: 'business-registry-service',
    initialize: async () => {
        console.log('Initializing business-registry-service module');
    },
    routes: (() => {
        const router = Router();
        router.use('/health', createHealthRoutes());
        router.use('/businesses', createBusinessRoutes());
        router.use('/system/maintenance', createMaintenanceRoutes());
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down business-registry-service module');
    }
};
