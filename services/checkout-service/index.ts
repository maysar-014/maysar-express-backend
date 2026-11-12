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
import { QuoteValidationService } from './src/infrastructure/services/quote-validation.service';
import { CatalogPriceValidatorService } from './src/infrastructure/services/catalog-price-validator.service';
import { PrismaEnablerLookupRepository } from './src/infrastructure/repositories/enabler-lookup.repository';
import { MultiSellerCheckoutUseCase } from './src/application/use-cases/multi-seller-checkout.use-case';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { prisma } from './src/infrastructure/database/prisma-client';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { appLogger } from '../../shared/logger/logger';

export const CheckoutModule: Module = {
    name: 'checkout-service',
    initialize: async () => {
        appLogger.info('Initializing checkout-service module');

        const cartRepository = new PrismaCartRepository(prisma);
        const checkoutRepository = new PrismaCheckoutRepository(prisma);
        const checkoutOrderRepository = new PrismaCheckoutOrderRepository(prisma);
        const eventBus = new EventBusAdapter();
        const quoteValidationService = new QuoteValidationService();
        const catalogPriceValidator = new CatalogPriceValidatorService();
        const enablerLookup = new PrismaEnablerLookupRepository(prisma);

        // Multi-seller checkout use case — exposed globally for checkout controller
        const multiSellerCheckoutUseCase = new MultiSellerCheckoutUseCase(
            quoteValidationService,
            eventBus,
            enablerLookup,
        );
        (globalThis as any).__multiSellerCheckoutUseCase = multiSellerCheckoutUseCase;

        const cartController = new CartController(cartRepository);
        const checkoutController = new CheckoutController(
            checkoutRepository,
            eventBus,
            cartRepository,
            enablerLookup,
            checkoutOrderRepository,
            quoteValidationService,
            catalogPriceValidator,
        );
        new CheckoutEventHandlers(eventBus, checkoutRepository, checkoutOrderRepository);

        // Add all routes to the pre-declared router that app.ts already mounted.
        const checkoutRouter = CheckoutModule.routes!;
        checkoutRouter.use('/health', healthRoutes);
        checkoutRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
        checkoutRouter.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
        checkoutRouter.use(requireAuth);
        checkoutRouter.use('/', createCheckoutRoutes(cartController, checkoutController));

        const aliasRouter = Router();
        aliasRouter.use(requireAuth);
        aliasRouter.use('/', createCartRoutes(cartController));

        CheckoutModule.routeAliases = [{ path: '/api/cart', router: aliasRouter }];
    },
    routes: Router(),
    routeAliases: [],
    shutdown: async () => {
        appLogger.info('Shutting down checkout-service module');
    }
};
