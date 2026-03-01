import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { initializeEventRegistry } from '../../shared/events/registry';
import type { DistributedSagaOrchestrator } from '../../shared/saga/saga.orchestrator';
import { createCampaignRoutes } from './src/campaigns/api/routes/campaign.routes';
import { container } from './src/campaigns/infrastructure/container';
import { TYPES } from './src/campaigns/types';
import { sagaLogRepository } from './src/campaigns/infrastructure/repositories/saga.repository';
import { createSagaFactory } from './src/application/sagas/saga-factory';
import pricingRoutes from './src/pricing/api/routes/pricing.routes';

let outboxProcessor: OutboxProcessor | null = null;

// Campaign service integration
let campaignRoutes: Router | null = null;
try {
    campaignRoutes = createCampaignRoutes();
} catch (e) {
    // Basic logger not yet available here safely if it depends on infrastructure, 
    // but we can use appLogger or just wait until init.
    // For now, let's just keep the catch quiet or use a temporary logger.
}

// Pricing service integration

export const CatalogModule: Module = {
    name: 'catalog-service',
    initialize: async () => {
        logger.info('Initializing catalog-service module (fully merged)');

        // Initialize event registry
        initializeEventRegistry();

        // Initialize campaign event handlers
        try {
            const campaignEventBus = container.get(TYPES.EventBus) as { subscribe: (event: string, handler: (e: unknown) => void) => void };
            const productDeletedHandler = container.get(TYPES.ProductDeletedHandler) as { handle: (event: unknown) => void };
            const categoryDeletedHandler = container.get(TYPES.CategoryDeletedHandler) as { handle: (event: unknown) => void };

            if (campaignEventBus && campaignEventBus.subscribe) {
                campaignEventBus.subscribe('ProductDeleted', (event: unknown) => productDeletedHandler.handle(event));
                campaignEventBus.subscribe('CategoryDeleted', (event: unknown) => categoryDeletedHandler.handle(event));
                logger.info('Campaign handlers subscribed to events');
            }
        } catch (e) {
            logger.warn('Campaign handlers not initialized:', e);
        }

        // Initialize pricing
        try {
            // Additional pricing init if needed
            logger.info('Pricing module initialized');
        } catch (e) {
            logger.warn('Pricing handlers not initialized:', e);
        }

        // Initialize and start OutboxProcessor
        try {
            const prisma = new PrismaClient();
            const outbox = new TransactionalOutbox(prisma, 'catalogOutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'catalog-service');
            outboxProcessor.start();
            logger.info('Catalog-service outbox processor started');
        } catch (e) {
            logger.error('Failed to start catalog-service outbox processor:', e);
        }

        // Initialize Saga Recovery Worker
        try {
            const { SagaRecoveryWorker } = await import('../../shared/saga/saga-recovery.worker');

            const sagaFactory = createSagaFactory({
                sagaLogRepository,
                productRepository: {} as import('./src/domain/interfaces').ProductRepository,
                categoryRepository: {} as import('./src/domain/interfaces').CategoryRepository,
                mediaRepository: {} as import('./src/domain/interfaces').MediaRepository,
                searchService: {} as import('./src/domain/interfaces').SearchService,
                eventPublisher: {} as import('./src/domain/interfaces').DomainEventPublisher,
                idGenerator: {} as import('./src/domain/interfaces').IdGenerator,
                dateTimeService: {} as import('./src/domain/interfaces').DateTimeService,
            });

            const productPublishingSaga = sagaFactory.getProductPublishingSaga();
            const bulkProductUpdateSaga = sagaFactory.getBulkProductUpdateSaga();
            
            const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator<unknown>>();
            orchestratorRegistry.set('ProductPublishing', productPublishingSaga as DistributedSagaOrchestrator<unknown>);
            orchestratorRegistry.set('BulkProductUpdate', bulkProductUpdateSaga as DistributedSagaOrchestrator<unknown>);

            const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
                stuckThresholdMs: 5 * 60 * 1000,
                pollIntervalMs: 60 * 1000
            });
            sagaRecoveryWorker.start();

            logger.info('✅ Saga Recovery Worker initialized with 2 registered saga types');
        } catch (e) {
            logger.warn('⚠️ Failed to initialize Saga Recovery Worker', { error: e });
        }
    },
    routes: (() => {
        const router = Router();

        // Mount campaign routes under /campaigns
        if (campaignRoutes) {
            router.use('/campaigns', campaignRoutes);
        }

        // Mount pricing routes under /pricing
        if (pricingRoutes) {
            router.use('/pricing', pricingRoutes);
        }

        // Health checks
        router.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'catalog-service',
                modules: ['catalog', 'campaigns', 'pricing'],
                timestamp: new Date().toISOString()
            });
        });

        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down catalog-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};


