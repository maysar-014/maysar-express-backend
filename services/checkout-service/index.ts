import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createCartRoutes, createCheckoutRoutes } from './src/api/routes/checkout.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { PrismaCartRepository } from './src/infrastructure/repositories/prisma-cart.repository';
import { PrismaCheckoutRepository } from './src/infrastructure/repositories/prisma-checkout.repository';
import { PrismaCheckoutOrderRepository } from './src/infrastructure/repositories/prisma-checkout-order.repository';
import { EventBusAdapter } from './src/infrastructure/messaging/event-bus.adapter';
import { CheckoutEventHandlers } from './src/application/handlers/checkout-event.handlers';
import { CartController } from './src/api/controllers/cart.controller';
import { CheckoutController } from './src/api/controllers/checkout.controller';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { prisma } from './src/infrastructure/database/prisma-client';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export const CheckoutModule: Module = {
    name: 'checkout-service',
    initialize: async () => {
        console.log('Initializing checkout-service module');
    },
    routes: (() => {
        const router = Router();

        const cartRepository = new PrismaCartRepository(prisma);
        const checkoutRepository = new PrismaCheckoutRepository(prisma);
        const checkoutOrderRepository = new PrismaCheckoutOrderRepository(prisma);
        const eventBus = new EventBusAdapter();

        const cartController = new CartController(cartRepository);
        const checkoutController = new CheckoutController(checkoutRepository, eventBus, cartRepository);
        new CheckoutEventHandlers(eventBus, checkoutRepository, checkoutOrderRepository);

        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        // Require authentication for checkout flows
        router.use(requireAuth);
        router.use('/', createCheckoutRoutes(cartController, checkoutController));

        return router;
    })(),
    routeAliases: (() => {
        const cartRepository = new PrismaCartRepository(prisma);
        const cartController = new CartController(cartRepository);
        const aliasRouter = Router();

        aliasRouter.use(requireAuth);
        aliasRouter.use('/', createCartRoutes(cartController));

        return [
            {
                path: '/api/cart',
                router: aliasRouter
            }
        ];
    })(),
    shutdown: async () => {
        console.log('Shutting down checkout-service module');
    }
};



