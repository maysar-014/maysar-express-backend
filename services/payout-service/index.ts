import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createPayoutRoutes } from './src/api/routes/payout.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { Container } from './src/container';
import { SagaRecoveryWorker } from '../../shared/saga/saga-recovery.worker';
import { SagaFactory } from '../../shared/saga/saga-factory';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';

let sagaRecoveryWorker: SagaRecoveryWorker | null = null;

export const PayoutModule: Module = {
    name: 'payout-service',
    initialize: async () => {
        console.log('Initializing payout-service module');
        const container = Container.getInstance();
        try {
            await container.prisma.$connect();
            container.outboxProcessor.start();

            const { provideSagaLogRepository } = await import('./src/infrastructure/repositories/saga.repository');
            const sagaLogRepository = provideSagaLogRepository(container.prisma);
            sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, SagaFactory.getRegistry(), {
                stuckThresholdMs: 5 * 60 * 1000,
                pollIntervalMs: 60 * 1000
            });
            sagaRecoveryWorker.start();
        } catch (error) {
            console.error('Failed to initialize payout-service module:', error);
        }
    },
    routes: (() => {
        const router = Router();
        const container = Container.getInstance();
        router.use('/payouts', requireAuth, createPayoutRoutes(container.payoutController));
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down payout-service module');
        try {
            sagaRecoveryWorker?.stop();
            const container = Container.getInstance();
            container.outboxProcessor.stop();
            await container.prisma.$disconnect();
        } catch (error) {
            console.error('Failed to shutdown payout-service module:', error);
        }
    }
};



