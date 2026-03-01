/**
 * Service Entry Point
 * Starts the HTTP server
 */

import { createApp } from './app';
import { config } from './config/config';
import { Container } from './container';
import { logger } from './infrastructure/services/logger.service';
import { SagaRecoveryWorker } from '@shared/saga/saga-recovery.worker';
import { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';
import { tracingService } from '../../../shared/tracing/openTelemetry';

async function startServer() {
    tracingService.start();
    const app = createApp();
    const container = Container.getInstance();

    // ...
    try {
        // Check database connection
        await container.prisma.$connect();
        logger.info('✅ Connected to database');

        container.outboxProcessor.start();
        logger.info('✅ Outbox processor started');

        // Initialize Saga Event Handler subscriptions
        await container.sagaEventHandler.setupSubscriptions();
        logger.info('✅ Saga subscriptions initialized');

        // Saga Recovery Worker
        const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator>();
        if (container.paymentProcessingSaga) {
            orchestratorRegistry.set('PaymentProcessingSaga', container.paymentProcessingSaga);
        }
        const sagaRecoveryWorker = new SagaRecoveryWorker(container.sagaLogRepository, orchestratorRegistry, {
            stuckThresholdMs: 5 * 60 * 1000,
            pollIntervalMs: 60 * 1000
        });
        sagaRecoveryWorker.start();
        logger.info('✅ Saga recovery worker started');

        app.listen(config.port, () => {
            logger.info(`🚀 Payment Service running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
        });

        const shutdown = async () => {
            logger.info('🛑 Shutting down gracefully...');
            sagaRecoveryWorker.stop();
            container.outboxProcessor.stop();
            await container.prisma.$disconnect();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        // ...
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
