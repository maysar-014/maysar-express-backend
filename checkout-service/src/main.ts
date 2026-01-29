import express from 'express';
import { PrismaClient } from '@prisma/client';
import { CartRepository } from './infrastructure/repositories/cart.repository';
import { CheckoutRepository } from './infrastructure/repositories/checkout.repository';
import { EventBusAdapter } from './infrastructure/messaging/event-bus.adapter';
import { InventoryReservationService } from './infrastructure/services/inventory-reservation.service';
import { DiscountService } from './infrastructure/services/discount.service';
import { OrderService } from './infrastructure/services/order.service';
import { CheckoutEventHandlers } from './application/handlers/checkout-event.handlers';
import { createCheckoutRoutes } from './api/routes/checkout.routes';
import { validateRequest, errorHandler, authMiddleware } from './api/middleware/checkout.middleware';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(validateRequest);
app.use(authMiddleware);

// Initialize repositories and services
const cartRepository = new CartRepository(prisma);
const checkoutRepository = new CheckoutRepository(prisma);
const eventBus = new EventBusAdapter();
const inventoryService = new InventoryReservationService(prisma);
const discountService = new DiscountService(prisma);
const orderService = new OrderService(prisma);

// Initialize event handlers
new CheckoutEventHandlers(eventBus, checkoutRepository);

// Register routes
app.use('/api/checkout', createCheckoutRoutes(cartRepository, checkoutRepository, eventBus));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'checkout-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`Checkout Service running on port ${PORT}`);
});

export default app;
