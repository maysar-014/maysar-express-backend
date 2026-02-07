import { Module } from '../../src/core/module.interface';
import { createCampaignRoutes } from './src/api/routes/campaign.routes';
import { container } from './src/container';
import { TYPES } from './src/types';
import { ProductDeletedHandler } from './src/application/handlers/product-deleted.handler';
import { CategoryDeletedHandler } from './src/application/handlers/category-deleted.handler';

export const CampaignModule: Module = {
    name: 'campaign-service',
    initialize: async () => {
        console.log('Initializing campaign-service module');

        const eventBus = container.get<any>(TYPES.EventBus);
        const productDeletedHandler = container.get<ProductDeletedHandler>(TYPES.ProductDeletedHandler);
        const categoryDeletedHandler = container.get<CategoryDeletedHandler>(TYPES.CategoryDeletedHandler);

        // Subscribe to events
        if (eventBus) {
            eventBus.subscribe('ProductDeleted', (event: any) => productDeletedHandler.handle(event));
            eventBus.subscribe('CategoryDeleted', (event: any) => categoryDeletedHandler.handle(event));
            console.log('Campaign service subscribed to ProductDeleted and CategoryDeleted events');
        }
    },
    routes: (() => {
        const router = createCampaignRoutes();

        // Health Checks
        router.get('/health', (req, res) => {
            res.json({ status: 'ok', service: 'campaign-service', timestamp: new Date().toISOString() });
        });

        router.get('/ready', async (req, res) => {
            res.json({ status: 'ready', service: 'campaign-service' });
        });

        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down campaign-service module');
    }
};
