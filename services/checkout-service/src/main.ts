import express from 'express';
import { PrismaCartRepository } from './infrastructure/repositories/prisma-cart.repository';
import { PrismaCheckoutRepository } from './infrastructure/repositories/prisma-checkout.repository';
import { PrismaCheckoutOrderRepository } from './infrastructure/repositories/prisma-checkout-order.repository';
import { PrismaEnablerLookupRepository } from './infrastructure/repositories/enabler-lookup.repository';
import { EventBusAdapter } from './infrastructure/messaging/event-bus.adapter';
import { CheckoutEventHandlers } from './application/handlers/checkout-event.handlers';
import { createCheckoutRoutes } from './api/routes/checkout.routes';
import { CartController } from './api/controllers/cart.controller';
import { CheckoutController } from './api/controllers/checkout.controller';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { logger } from './infrastructure/services/logger.service';
import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { prisma } from './infrastructure/database/prisma-client';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';

// Initialize Tracing
tracingService.start();

const app = express();

app.use(express.json());
app.use(requestLogger);

// Initialize repositories and services
const cartRepository = new PrismaCartRepository(prisma);
const checkoutRepository = new PrismaCheckoutRepository(prisma);
const checkoutOrderRepository = new PrismaCheckoutOrderRepository(prisma);
const enablerLookupRepository = new PrismaEnablerLookupRepository(prisma);
const eventBus = new EventBusAdapter();

// Initialize controllers
const cartController = new CartController(cartRepository);
const checkoutController = new CheckoutController(checkoutRepository, eventBus, cartRepository, enablerLookupRepository);

// Initialize event handlers
new CheckoutEventHandlers(eventBus, checkoutRepository, checkoutOrderRepository);

// Health check routes
app.use('/health', healthRoutes);

app.use(correlationMiddleware());

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Register routes
app.use('/api/checkout', createCheckoutRoutes(cartController, checkoutController));
app.use('/api/v1/system/maintenance', createMaintenanceRoutes());

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  logger.info(`Checkout Service running on port ${PORT}`);
});

export default app;
