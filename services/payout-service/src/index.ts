import { createApp } from './app';
import { config } from './config/config';
import { Container } from './container';
import { tracingService } from '../../../shared/tracing/openTelemetry';
import { SagaRecoveryWorker } from '@shared/saga/saga-recovery.worker';
import { SagaFactory } from '@shared/saga/saga-factory';
import { inMemoryEventBus } from '@shared-events/eventBus';

// Initialize Tracing
tracingService.start();

let sagaRecoveryWorker: SagaRecoveryWorker | null = null;

async function startServer() {
    const app = createApp();
    const container = Container.getInstance();

    try {
        await container.prisma.$connect();
        console.log('✅ Connected to database');

        container.outboxProcessor.start();
        console.log('✅ Outbox processor started');

        // Start Saga Recovery Worker
        const { provideSagaLogRepository } = await import('./infrastructure/repositories/saga.repository');
        const sagaLogRepository = provideSagaLogRepository(container.prisma);
        sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, SagaFactory.getRegistry(), {
            stuckThresholdMs: 5 * 60 * 1000,
            pollIntervalMs: 60 * 1000
        });
        sagaRecoveryWorker.start();
        console.log('✅ Saga recovery worker started');

        app.listen(config.port, () => {
            console.log(`🚀 Payout Service running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
        });

        const shutdown = async () => {
            console.log('\n🛑 Shutting down gracefully...');
            sagaRecoveryWorker?.stop();
            container.outboxProcessor.stop();
            await inMemoryEventBus.shutdown();
            await container.prisma.$disconnect();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
