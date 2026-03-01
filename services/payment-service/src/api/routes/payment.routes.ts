/**
 * Payment Routes
 * Defines HTTP routes for payment operations
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../../../../../shared/middleware/redis-rate-limit.store';
import Redis from 'ioredis';
import { PaymentController } from '../controllers/payment.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    store: new RedisRateLimitStore(redisClient, 'rl:payment:')
});

export function createPaymentRoutes(paymentController: PaymentController): Router {
    const router = Router();

    router.use(paymentLimiter);
    router.use(idempotencyMiddleware.middleware());

    // Create payment
    router.post('/', (req, res) => paymentController.createPayment(req, res));

    // Get payment by ID
    router.get('/:id', (req, res) => paymentController.getPayment(req, res));

    // Get payment by order ID
    router.get('/order/:orderId', (req, res) => paymentController.getPaymentByOrderId(req, res));

    // Check payment status
    router.get('/:id/status', (req, res) => paymentController.checkStatus(req, res));

    // Refund payment
    router.post('/:id/refund', (req, res) => paymentController.refundPayment(req, res));

    return router;
}
