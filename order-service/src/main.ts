// Order Service Entry Point
import express from 'express';
import { OrderRepositoryImpl } from './infrastructure/repositories/order.repository';
import { EventPublisherImpl } from './infrastructure/messaging/event-publisher';
import { PlaceOrderUseCase } from './application/use-cases/place-order.use-case';
import { OrderController } from './api/controllers/order.controller';
import { setupOrderRoutes } from './api/routes/order.routes';

const app = express();

app.use(express.json());

// Dependency injection
const orderRepository = new OrderRepositoryImpl();
const eventPublisher = new EventPublisherImpl();
const placeOrderUseCase = new PlaceOrderUseCase(orderRepository, eventPublisher);
const orderController = new OrderController(placeOrderUseCase);

// Setup routes
const orderRoutes = setupOrderRoutes(orderController);
app.use('/api', orderRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
