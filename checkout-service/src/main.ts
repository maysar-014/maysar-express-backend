import express from 'express';
import { CartRepository } from './infrastructure/repositories/cart.repository';
import { CheckoutRepository } from './infrastructure/repositories/checkout.repository';
import { EventBusAdapter } from './infrastructure/messaging/event-bus.adapter';
import { CheckoutEventHandlers } from './application/handlers/checkout-event.handlers';
import { createCheckoutRoutes } from './api/routes/checkout.routes';
import { errorHandler } from './api/middleware/checkout.middleware';
import { CartController } from './api/controllers/cart.controller';
import { CheckoutController } from './api/controllers/checkout.controller';
import { logger } from './shared/logger/logger';
import { config } from './shared/config';

const app = express();

app.use(express.json());

// Initialize repositories and services
const cartRepository = new CartRepository();
const checkoutRepository = new CheckoutRepository();
const eventBus = new EventBusAdapter();
// const inventoryService = new InventoryReservationService(prisma);
// const discountService = new DiscountService(prisma);
// const orderService = new OrderService(prisma);

// Initialize controllers
const cartController = new CartController(cartRepository);
const checkoutController = new CheckoutController(checkoutRepository, eventBus);

// Initialize event handlers
new CheckoutEventHandlers(eventBus, checkoutRepository);

// Register routes
app.use('/api/checkout', createCheckoutRoutes(cartController, checkoutController));

// Health check endpoints
app.get('/health/live', (_req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date()
  });
});

app.get('/health/ready', async (_req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date()
  });
});

app.get('/health', async (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date()
  });
});

app.use(errorHandler);

const PORT = config.app.port;

app.listen(PORT, () => {
  logger.info(`Checkout Service running on port ${PORT}`, { port: PORT });
});

export default app;
