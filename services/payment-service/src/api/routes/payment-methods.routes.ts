import { Router } from "express";
import { PaymentMethodsController } from "../controllers/payment-methods.controller";
import { asyncHandler } from "@shared/middleware/async-handler";

export function createPaymentMethodsRoutes(
  paymentMethodsController: PaymentMethodsController,
): Router {
  const router = Router();

  // Authoritative payment-method discovery — safe, public payload.
  router.get(
    "/",
    asyncHandler((req, res) => paymentMethodsController.listPublic(req, res)),
  );

  return router;
}

export function createPaymentMethodsAdminRoutes(
  paymentMethodsController: PaymentMethodsController,
): Router {
  const router = Router();

  // Operational state of every method (credentials never exposed).
  router.get(
    "/",
    asyncHandler((req, res) => paymentMethodsController.listAdmin(req, res)),
  );

  return router;
}
