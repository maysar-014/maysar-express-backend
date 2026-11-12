import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import commissionRoutes from './src/api/routes/commission.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { appLogger } from '../../shared/logger/logger';

export const CommissionModule: Module = {
    // Canonical module name: the bootstrap derives the public mount path from it
    // (strip the `-service` suffix â†’ /api/commission), which is the path the platform
    // contract, the flow docs and the E2E suite use.
    name: 'commission-service',
    initialize: async () => {
        appLogger.info('Initializing commission-service module');
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/', commissionRoutes);
        return router;
    })(),
    shutdown: async () => {
        appLogger.info('Shutting down commission-service module');
    }
};
