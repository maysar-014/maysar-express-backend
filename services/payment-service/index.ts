import { Router } from "express";
import { Module } from "../../src/core/module.interface";
import { EventIdempotency } from "../../shared/middleware/idempotency";
import { logger } from "./src/infrastructure/services/logger.service";
import { healthRoutes } from "./src/api/routes/health.routes";
import { createMaintenanceRoutes } from "./src/api/routes/maintenance.routes";
import { createWebhookRoutes } from "./src/api/routes/webhook.routes";
import {
  createPaymentMethodsRoutes,
  createPaymentMethodsAdminRoutes,
} from "./src/api/routes/payment-methods.routes";
import { register as metricsRegistry } from "./src/infrastructure/monitoring/metrics";
import { Container as PaymentContainer } from "./src/container";
import { createPrismaClient } from "@shared/database/prisma-client";
import {
  requireAuth,
  requireRoleOrService,
} from "@shared/middleware/auth-context.middleware";

let _eventIdempotency: EventIdempotency;

export const PaymentModule: Module = {
  name: "payment-service",
  initialize: async () => {
    logger.info("Initializing payment-service module");

    const prisma = createPrismaClient();
    _eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

    const container = PaymentContainer.getInstance();
    container.sagaEventHandler.setupSubscriptions().catch((err: Error) => {
      logger.error("Failed to setup saga subscriptions:", err);
    });
    container.paymentEventHandlers.registerHandlers();

    // Startup payment-method configuration validation: every enabled method
    // must be operational for its environment. Misconfigured methods are
    // logged prominently here AND rejected at transaction time by the
    // process-payment environment gate.
    const paymentMethodConfig = container.paymentMethodConfigService;
    for (const line of paymentMethodConfig.formatStartupReport()) {
      logger.info(line);
    }
    const misconfiguredPaymentMethods = paymentMethodConfig.validateAll();
    if (misconfiguredPaymentMethods.length > 0) {
      logger.warn(
        `Payment configuration error: the following methods are enabled but NOT operationally ` +
          `configured: ${misconfiguredPaymentMethods.join(", ")}. Transactions using these methods ` +
          "will be rejected with METHOD_MISCONFIGURED until valid configuration is provided.",
      );
    }

    const router = Router();

    router.use("/health", healthRoutes);
    router.get("/metrics", async (_req, res) => {
      res.set("Content-Type", metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const createPaymentRoutes =
        require("./src/api/routes/payment.routes").createPaymentRoutes;
      router.use(
        "/payments/webhooks",
        createWebhookRoutes(container.webhookController),
      );
      router.use(
        "/payments",
        requireAuth,
        createPaymentRoutes(container.paymentController),
      );
      router.use("/webhooks", createWebhookRoutes(container.webhookController));
      // Authoritative method discovery for buyer apps — no hard-coded frontend list.
      router.use(
        "/payment-methods",
        createPaymentMethodsRoutes(container.paymentMethodsController),
      );
      // Operations/admin view of every method's environment + configuration state.
      router.use(
        "/admin/payment-methods",
        requireRoleOrService(["admin", "system"]),
        createPaymentMethodsAdminRoutes(container.paymentMethodsController),
      );
    } catch (error) {
      logger.warn(
        "Failed to mount payment routes, falling back to degraded handler:",
        error,
      );
      router.all("/payments/*", (_req, res) => {
        res.status(503).json({
          success: false,
          error: "Payment routes unavailable",
          reason: "Initialization failure",
        });
      });
    }

    router.use(
      "/system/maintenance",
      requireRoleOrService(["admin", "system"]),
      createMaintenanceRoutes(),
    );

    PaymentModule.routes = router;
  },
  routes: Router(),
  shutdown: async () => {
    logger.info("Shutting down payment-service module");
  },
};

// Exported for injection into PaymentProcessingSaga when instantiated by internal wiring
export { _eventIdempotency as eventIdempotency };
