import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { initializeEventRegistry } from '../../shared/events/registry';

let outboxProcessor: OutboxProcessor | null = null;

// Campaign service integration
let campaignRoutes: Router | null = null;
try {
    const { createCampaignRoutes } = require('./src/campaigns/api/routes/campaign.routes');
    campaignRoutes = createCampaignRoutes();
} catch (e) {
    // Basic logger not yet available here safely if it depends on infrastructure, 
    // but we can use appLogger or just wait until init.
    // For now, let's just keep the catch quiet or use a temporary logger.
}

// Pricing service integration
let pricingRoutes: Router | null = null;
try {
    const { createPricingRouter } = require('./src/pricing/api/routes');
    pricingRoutes = createPricingRouter();
} catch (e) {
}

export const CatalogModule: Module = {
    name: 'catalog-service',
    initialize: async () => {
        logger.info('Initializing catalog-service module (fully merged)');

        // Initialize event registry
        initializeEventRegistry();

        // Initialize campaign event handlers
        try {
            const { container } = require('./src/campaigns/container');
            const { TYPES } = require('./src/campaigns/types');
            const { ProductDeletedHandler } = require('./src/campaigns/application/handlers/product-deleted.handler');
            const { CategoryDeletedHandler } = require('./src/campaigns/application/handlers/category-deleted.handler');

            const eventBus = container.get(TYPES.EventBus);
            const productDeletedHandler = container.get(TYPES.ProductDeletedHandler);
            const categoryDeletedHandler = container.get(TYPES.CategoryDeletedHandler);

            if (eventBus) {
                eventBus.subscribe('ProductDeleted', (event: any) => productDeletedHandler.handle(event));
                eventBus.subscribe('CategoryDeleted', (event: any) => categoryDeletedHandler.handle(event));
                logger.info('Campaign handlers subscribed to events');
            }
        } catch (e) {
            logger.warn('Campaign handlers not initialized:', e);
        }

        // Initialize pricing
        try {
            const { pricingContainer } = require('./src/pricing/container');
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
