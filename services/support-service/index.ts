import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { ticketRouter } from './src/api/routes/ticket.routes';
import { agentRouter } from './src/api/routes/agent.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { SupportEventSubscriber } from './src/infrastructure/messaging/support-event-subscriber';
import { container } from './src/infrastructure/container';
import { TYPES } from './src/types';
import type { DistributedSagaOrchestrator } from '../../shared/saga/saga.orchestrator';
import { logger } from './src/infrastructure/services/logger.service';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export const SupportModule: Module = {
    name: 'support-service',
    initialize: async () => {
        console.log('Initializing support-service module');
        const subscriber = container.get<SupportEventSubscriber>(TYPES.SupportEventSubscriber);
        await subscriber.initialize();

        // Initialize Saga Recovery Worker
        try {
            const { TicketLifecycleSaga } = await import('./src/application/sagas/ticket-lifecycle.saga');
            const { sagaLogRepository } = await import('./src/infrastructure/repositories/saga.repository');
            const { SagaRecoveryWorker } = await import('../../shared/saga/saga-recovery.worker');

            const ticketLifecycleSaga = new TicketLifecycleSaga();
            
            const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator<unknown>>();
            orchestratorRegistry.set('TicketLifecycleSaga', ticketLifecycleSaga as DistributedSagaOrchestrator<unknown>);

            const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
                stuckThresholdMs: 5 * 60 * 1000,
                pollIntervalMs: 60 * 1000
            });
            sagaRecoveryWorker.start();

            if (logger) {
                logger.info('✅ Saga Recovery Worker initialized with 1 registered saga type');
            } else {
                console.log('✅ Saga Recovery Worker initialized with 1 registered saga type');
            }
        } catch (error) {
            if (logger) {
                logger.warn('⚠️ Failed to initialize Saga Recovery Worker', { error });
            } else {
                console.warn('⚠️ Failed to initialize Saga Recovery Worker', error);
            }
        }
    },
    routes: (() => {
        const router = Router();
        router.use('/tickets', requireAuth, ticketRouter);
        router.use('/agents', requireAuth, agentRouter);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down support-service module');
        // Cleanup connections if needed
    }
};



