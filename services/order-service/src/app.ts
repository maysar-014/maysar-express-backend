import express from 'express';
import { IdempotencyMiddleware } from '../../../shared/middleware/idempotency';
import { idempotentEventBus } from '../../../shared/events/idempotentEventBus';
import { OrderService } from './orderService';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const orderService = new OrderService(prisma);

// Initialize idempotency middleware
const idempotencyMiddleware = new IdempotencyMiddleware(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    ttlSeconds: 24 * 60 * 60, // 24 hours
    headerName: 'idempotency-key'
  }
);

app.use(express.json());
app.use(idempotencyMiddleware.middleware());

// Idempotent order creation endpoint
app.post('/orders', async (req, res) => {
  try {
    const result = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Idempotent payment processing endpoint
app.post('/orders/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await orderService.processPayment(orderId, req.body);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Event consumers with idempotency
idempotentEventBus.subscribe('payment.succeeded.v1', {
  name: 'order-payment-processor',
  handler: async (envelope) => {
    const { orderId, paymentId } = envelope.payload;
    await orderService.markOrderAsPaid(orderId, paymentId);
    console.log(`Order ${orderId} marked as paid`);
  }
});

idempotentEventBus.subscribe('inventory.reserved.v1', {
  name: 'order-inventory-processor',
  handler: async (envelope) => {
    const { orderId } = envelope.payload;
    await orderService.markInventoryReserved(orderId);
    console.log(`Inventory reserved for order ${orderId}`);
  }
});

idempotentEventBus.subscribe('payment.failed.v1', {
  name: 'order-payment-failure-processor',
  handler: async (envelope) => {
    const { orderId, reason } = envelope.payload;
    await orderService.handlePaymentFailure(orderId, reason);
    console.log(`Payment failed for order ${orderId}: ${reason}`);
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT} with idempotency enabled`);
});

export { app };