/**
 * Payment Admin Routes
 * Admin payment summary roster. Mounted at /admin/payments behind
 * requireRoleOrService(["admin", "system"]) — see index.ts.
 * Block/flag actions live under /payments/:id/block|flag in payment.routes.ts
 * (the path contract documented in PAYMENT_SERVICE_SYSTEM.md §8).
 */

import { Router } from "express";
import { z } from "zod";
import { zodId } from "@shared/validation/id";
import { asyncHandler } from "@shared/middleware/async-handler";
import { validateRequest } from "../middleware/validation.middleware";
import { PaymentAdminController } from "../controllers/payment-admin.controller";

const paymentAdminIdParamsSchema = z
  .object({
    id: zodId(),
  })
  .strict();

const listPaymentsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export function createPaymentAdminRoutes(
  paymentAdminController: PaymentAdminController,
): Router {
  const router = Router();

  // Payment summary list — feeds the admin payments roster.
  router.get(
    "/",
    validateRequest({ query: listPaymentsQuerySchema }),
    asyncHandler((req, res) => paymentAdminController.listPayments(req, res)),
  );

  return router;
}