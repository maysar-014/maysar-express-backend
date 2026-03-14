/**
 * Payment Routes
 * Defines HTTP routes for payment operations
 */

import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../../../../../shared/middleware/redis-rate-limit.store';
import { PaymentController } from '../controllers/payment.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { createHash } from 'crypto';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    store: new RedisRateLimitStore(redisClient, 'rl:payment:'),
    passOnStoreError: true
});

const webhookIdempotencyMiddleware = new IdempotencyMiddleware(
    process.env.REDIS_URL!,
    {
        keyPrefix: 'webhook:idempotency:',
        headerName: 'x-webhook-idempotency-key',
        generateKey: (req) => {
            const bodyPayload = (() => {
                if (Buffer.isBuffer(req.body)) {
                    try {
                        return JSON.parse(req.body.toString('utf8') || '{}');
                    } catch {
                        return {};
                    }
                }
                return req.body || {};
            })();

            const txRef =
                bodyPayload.OrderTrackingId ||
                bodyPayload.orderTrackingId ||
                bodyPayload.merchant_reference ||
                bodyPayload.merchantReference ||
                bodyPayload.tx_ref ||
                bodyPayload?.data?.tx_ref ||
                bodyPayload?.data?.order_tracking_id ||
                bodyPayload?.data?.merchant_reference ||
                req.query.OrderTrackingId;
            const eventStatus = bodyPayload.status || bodyPayload?.data?.status || req.query.Status || 'UNKNOWN';

            if (txRef) {
                return createHash('sha256')
                    .update(`${txRef}:${eventStatus}`)
                    .digest('hex');
            }
            return '';
        }
    }
);

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

    // Webhook endpoint (POST with idempotency based on query params)
    router.post(
        '/webhooks/pesapal',
        express.raw({ type: '*/*' }),
        webhookIdempotencyMiddleware.middleware(),
        (req, res) => paymentController.handlePesapalWebhook(req, res)
    );

    return router;
}

