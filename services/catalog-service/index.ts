import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

// Campaign service integration
let campaignRoutes: Router | null = null;
try {
    const { createCampaignRoutes } = require('./src/campaigns/api/routes/campaign.routes');
    campaignRoutes = createCampaignRoutes();
} catch (e) {
    console.warn('Campaign routes not available:', e);
}

// Pricing service integration
let pricingRoutes: Router | null = null;
try {
    const { createPricingRouter } = require('./src/pricing/api/routes');
    pricingRoutes = createPricingRouter();
} catch (e) {
    console.warn('Pricing routes not available:', e);
}

export const CatalogModule: Module = {
    name: 'catalog-service',
    initialize: async () => {
        console.log('Initializing catalog-service module (fully merged)');

        // Initialize campaign event handlers
        try {
            const { container } = require('./src/campaigns/container');
            const { TYPES } = require('./src/campaigns/types');
            const { ProductDeletedHandler } = require('./src/campaigns/application/handlers/product-deleted.handler');
            const { CategoryDeletedHandler } = require('./src/campaigns/application/handlers/category-deleted.handler');

            const eventBus = container.get<any>(TYPES.EventBus);
            const productDeletedHandler = container.get<ProductDeletedHandler>(TYPES.ProductDeletedHandler);
            const categoryDeletedHandler = container.get<CategoryDeletedHandler>(TYPES.CategoryDeletedHandler);

            if (eventBus) {
                eventBus.subscribe('ProductDeleted', (event: any) => productDeletedHandler.handle(event));
                eventBus.subscribe('CategoryDeleted', (event: any) => categoryDeletedHandler.handle(event));
                console.log('Campaign handlers subscribed to events');
            }
        } catch (e) {
            console.warn('Campaign handlers not initialized:', e);
        }

        // Initialize pricing
        try {
            const { pricingContainer } = require('./src/pricing/container');
            // Additional pricing init if needed
            console.log('Pricing module initialized');
        } catch (e) {
            console.warn('Pricing handlers not initialized:', e);
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
        console.log('Shutting down catalog-service module');
    }
};
