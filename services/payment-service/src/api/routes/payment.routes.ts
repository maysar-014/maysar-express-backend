/**
 * Payment Routes
 * Defines HTTP routes for payment operations
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../../../../../shared/middleware/redis-rate-limit.store";
import { PaymentController } from "../controllers/payment.controller";
import { PaymentAdminController } from "../controllers/payment-admin.controller";
import { requireRoleOrService } from "@shared/middleware/auth-context.middleware";
import {
  getSharedRedisClient,
  resolveRedisUrl,
} from "@shared/redis/ioredis-client";
import { asyncHandler } from "@shared/middleware/async-handler";
import { validateRequest } from "../middleware/validation.middleware";
import { z } from "zod";
import { zodId } from "@shared/validation/id";
import { orderIdSchema } from "../validators/payment.validator";

const redisClient = getSharedRedisClient(
  resolveRedisUrl(process.env.REDIS_URL),
);

const disableRateLimit =
  process.env.PAYMENT_RATE_LIMIT_DISABLED === "true" ||
  process.env.NODE_ENV !== "production";

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: new RedisRateLimitStore(redisClient, "rl:payment:"),
  passOnStoreError: true,
  skip: () => disableRateLimit,
});

const paymentMethodSchema = z.enum([
  "MOBILE_MONEY",
  "MPESA",
  "AIRTEL_MONEY",
  "TIGO_PESA",
  "MIXX_BY_YAS",
  "HALOPESA",
  "WALLET",
  "CARD",
  "BANK_TRANSFER",
]);
const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F]+$/u;
const EXAMPLE_DOT_COM_EMAIL_PATTERN =
  /^[A-Za-z][A-Za-z0-9._-]{1,63}@example\.com$/;
const paymentMethodMinimums: Partial<
  Record<z.infer<typeof paymentMethodSchema>, number>
> = {
  MOBILE_MONEY: 500,
  MPESA: 500,
  AIRTEL_MONEY: 500,
  TIGO_PESA: 500,
  MIXX_BY_YAS: 500,
  HALOPESA: 500,
  WALLET: 100,
  CARD: 1000,
  BANK_TRANSFER: 1000,
};

const createPaymentRequestSchema = {
  body: z
    .object({
      orderId: orderIdSchema,
      userId: zodId().optional(),
      amount: z.number().positive(),
      currency: z.string().length(3).default("TZS"),
      method: paymentMethodSchema,
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional(),
      customerName: z
        .string()
        .min(1)
        .regex(SAFE_VISIBLE_STRING_PATTERN)
        .optional(),
      customerEmail: z
        .string()
        .email()
        .min(14)
        .max(76)
        .regex(EXAMPLE_DOT_COM_EMAIL_PATTERN)
        .optional(),
      metadata: z.record(z.any()).optional(),
      callbackUrl: z.string().url().optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      const minimum = paymentMethodMinimums[value.method];

      if (minimum !== undefined && value.amount < minimum) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum,
          inclusive: true,
          type: "number",
          path: ["amount"],
          message: `Amount must be at least ${minimum} for ${value.method}`,
        });
      }
    }),
};

const paymentIdParamsSchema = z
  .object({
    id: zodId(),
  })
  .strict();

const paymentOrderParamsSchema = z
  .object({
    orderId: orderIdSchema,
  })
  .strict();

const refundPaymentRequestSchema = {
  params: paymentIdParamsSchema,
  body: z
    .object({
      amount: z.number().positive().optional(),
      reason: z.string().min(3),
      reasonDetails: z.string().min(1).optional(),
    })
    .strict(),
};

const blockPaymentAdminRequestSchema = {
  params: paymentIdParamsSchema,
  body: z
    .object({
      reason: z.string().min(3).max(500),
    })
    .strict(),
};

const flagPaymentAdminRequestSchema = {
  params: paymentIdParamsSchema,
  body: z
    .object({
      reason: z.string().min(3).max(500),
      flagType: z.string().min(1).max(64).default("MANUAL_REVIEW"),
    })
    .strict(),
};

export function createPaymentRoutes(
  paymentController: PaymentController,
  paymentAdminController: PaymentAdminController,
): Router {
  const router = Router();

  router.use(paymentLimiter);

  // Create payment
  router.post(
    "/",
    validateRequest(createPaymentRequestSchema),
    asyncHandler((req, res) => paymentController.createPayment(req, res)),
  );

  // Get payment by order ID — MUST come before /:id to prevent "order" being matched as a payment ID
  router.get(
    "/order/:orderId",
    validateRequest({ params: paymentOrderParamsSchema }),
    asyncHandler((req, res) => paymentController.getPaymentByOrderId(req, res)),
  );

  // Get payment by ID
  router.get(
    "/:id",
    validateRequest({ params: paymentIdParamsSchema }),
    asyncHandler((req, res) => paymentController.getPayment(req, res)),
  );

  // Check payment status
  router.get(
    "/:id/status",
    validateRequest({ params: paymentIdParamsSchema }),
    asyncHandler((req, res) => paymentController.checkStatus(req, res)),
  );

  // Refund payment
  router.post(
    "/:id/refund",
    validateRequest(refundPaymentRequestSchema),
    asyncHandler((req, res) => paymentController.refundPayment(req, res)),
  );

  // Block an in-flight payment (admin/system only) — PENDING/PROCESSING → FAILED
  router.post(
    "/:id/block",
    requireRoleOrService(["admin", "system"]),
    validateRequest(blockPaymentAdminRequestSchema),
    asyncHandler((req, res) => paymentAdminController.blockPayment(req, res)),
  );

  // Flag a payment for review (admin/system only) — audit metadata only
  router.post(
    "/:id/flag",
    requireRoleOrService(["admin", "system"]),
    validateRequest(flagPaymentAdminRequestSchema),
    asyncHandler((req, res) => paymentAdminController.flagPayment(req, res)),
  );

  return router;
}
