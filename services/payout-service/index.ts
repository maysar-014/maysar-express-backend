import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createPayoutRoutes } from './src/api/routes/payout.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { Container } from './src/container';
import { SagaRecoveryWorker } from '../../shared/saga/saga-recovery.worker';
import { SagaFactory } from '../../shared/saga/saga-factory';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { appLogger } from '../../shared/logger/logger';

let sagaRecoveryWorker: SagaRecoveryWorker | null = null;

export const PayoutModule: Module = {
    name: 'payout-service',
    initialize: async () => {
        appLogger.info('Initializing payout-service module');
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
        appLogger.error('Failed to initialize payout-service module', { error: error instanceof Error ? error.message : String(error) });
        }
    },
    routes: (() => {
        const router = Router();
        const container = Container.getInstance();
        router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'payout-service' }));
        router.get('/health/live', (_req, res) => res.json({ success: true, status: 'ok' }));
        router.use('/payouts', requireAuth, createPayoutRoutes(container.payoutController));
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        return router;
    })(),
    shutdown: async () => {
        appLogger.info('Shutting down payout-service module');
        try {
            sagaRecoveryWorker?.stop();
            const container = Container.getInstance();
            container.outboxProcessor.stop();
            await container.prisma.$disconnect();
        } catch (error) {
        appLogger.error('Failed to shutdown payout-service module', { error: error instanceof Error ? error.message : String(error) });
        }
    }
};



