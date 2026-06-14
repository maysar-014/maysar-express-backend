import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import commissionRoutes from './src/api/routes/commission.routes';
import { healthRoutes } from './src/api/routes/health.routes';

export const CommissionModule: Module = {
    name: 'commissions-service',
    initialize: async () => {
        console.log('Initializing commission-service module');
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/', commissionRoutes);
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down commission-service module');
    }
};
