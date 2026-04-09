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
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';
import { zodId } from '@shared/validation/id';
import { orderIdSchema } from '../validators/payment.validator';
import { requireWebhookIdempotencyKey, validatePesapalWebhookRequest } from './pesapal-webhook.middleware';

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));

const disableRateLimit = process.env.PAYMENT_RATE_LIMIT_DISABLED === 'true'
    || process.env.NODE_ENV !== 'production';

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    store: new RedisRateLimitStore(redisClient, 'rl:payment:'),
    passOnStoreError: true,
    skip: () => disableRateLimit
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

const paymentMethodSchema = z.enum([
    'MOBILE_MONEY',
    'MPESA',
    'AIRTEL_MONEY',
    'TIGO_PESA',
    'HALOPESA',
    'WALLET',
    'CARD',
    'BANK_TRANSFER'
]);
const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F]+$/u;
const EXAMPLE_DOT_COM_EMAIL_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,63}@example\.com$/;
const paymentMethodMinimums: Partial<Record<z.infer<typeof paymentMethodSchema>, number>> = {
    MOBILE_MONEY: 500,
    MPESA: 500,
    AIRTEL_MONEY: 500,
    TIGO_PESA: 500,
    HALOPESA: 500,
    WALLET: 100,
    CARD: 1000,
    BANK_TRANSFER: 1000
};

const createPaymentRequestSchema = {
    body: z.object({
        orderId: orderIdSchema,
        userId: zodId().optional(),
        amount: z.number().positive(),
        currency: z.string().length(3).default('TZS'),
        method: paymentMethodSchema,
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
        customerName: z.string().min(1).regex(SAFE_VISIBLE_STRING_PATTERN).optional(),
        customerEmail: z.string().email().min(14).max(76).regex(EXAMPLE_DOT_COM_EMAIL_PATTERN).optional(),
        metadata: z.record(z.any()).optional(),
        callbackUrl: z.string().url().optional()
    }).strict().superRefine((value, ctx) => {
        const minimum = paymentMethodMinimums[value.method];

        if (minimum !== undefined && value.amount < minimum) {
            ctx.addIssue({
                code: z.ZodIssueCode.too_small,
                minimum,
                inclusive: true,
                type: 'number',
                path: ['amount'],
                message: `Amount must be at least ${minimum} for ${value.method}`
            });
        }
    })
};

const paymentIdParamsSchema = z.object({
    id: zodId()
}).strict();

const paymentOrderParamsSchema = z.object({
    orderId: orderIdSchema
}).strict();

const refundPaymentRequestSchema = {
    params: paymentIdParamsSchema,
    body: z.object({
        amount: z.number().positive().optional(),
        reason: z.string().min(3),
        reasonDetails: z.string().min(1).optional()
    }).strict()
};

export function createPaymentRoutes(paymentController: PaymentController): Router {
    const router = Router();

    router.use(paymentLimiter);
    router.use(idempotencyMiddleware.middleware());

    // Create payment
    router.post(
        '/',
        validateRequest(createPaymentRequestSchema),
        asyncHandler((req, res) => paymentController.createPayment(req, res))
    );

    // Get payment by ID
    router.get(
        '/:id',
        validateRequest({ params: paymentIdParamsSchema }),
        asyncHandler((req, res) => paymentController.getPayment(req, res))
    );

    // Get payment by order ID
    router.get(
        '/order/:orderId',
        validateRequest({ params: paymentOrderParamsSchema }),
        asyncHandler((req, res) => paymentController.getPaymentByOrderId(req, res))
    );

    // Check payment status
    router.get(
        '/:id/status',
        validateRequest({ params: paymentIdParamsSchema }),
        asyncHandler((req, res) => paymentController.checkStatus(req, res))
    );

    // Refund payment
    router.post(
        '/:id/refund',
        validateRequest(refundPaymentRequestSchema),
        asyncHandler((req, res) => paymentController.refundPayment(req, res))
    );

    // Webhook endpoint (POST with idempotency based on query params)
    router.post(
        '/webhooks/pesapal',
        express.raw({ type: '*/*' }),
        requireWebhookIdempotencyKey,
        validatePesapalWebhookRequest,
        webhookIdempotencyMiddleware.middleware(),
        asyncHandler((req, res) => paymentController.handlePesapalWebhook(req, res))
    );

    return router;
}

