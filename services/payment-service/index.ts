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
    try {
      await container.sagaEventHandler.setupSubscriptions();
      // Check subscriber count on the exact eventBus instance the saga subscribed to
      const countOnContainerBus = (container as any).eventBus?.getSubscriberCount?.('OrderCreated') ?? -1;
      logger.info(`Payment saga subscriptions registered — OrderCreated on container.eventBus: ${countOnContainerBus}`);
      console.log(`[payment-service] OrderCreated on container.eventBus: ${countOnContainerBus}`);
    } catch (err: Error | any) {
      logger.error("Failed to setup saga subscriptions:", err);
      console.error('[payment-service] SAGA SETUP FAILED:', err?.message);
    }
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

    // Add all routes to the pre-declared router that app.ts already mounted.
    const payRouter = PaymentModule.routes!;
    payRouter.use("/health", healthRoutes);
    payRouter.get("/metrics", async (_req, res) => {
      res.set("Content-Type", metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const createPaymentRoutes =
        require("./src/api/routes/payment.routes").createPaymentRoutes;
      const createPaymentAdminRoutes =
        require("./src/api/routes/payment-admin.routes").createPaymentAdminRoutes;
      payRouter.use(
        "/payments/webhooks",
        createWebhookRoutes(container.webhookController),
      );
      payRouter.use(
        "/payments",
        requireAuth,
        createPaymentRoutes(
          container.paymentController,
          container.paymentAdminController,
        ),
      );
      payRouter.use("/webhooks", createWebhookRoutes(container.webhookController));
      payRouter.use(
        "/payment-methods",
        createPaymentMethodsRoutes(container.paymentMethodsController),
      );
      payRouter.use(
        "/admin/payment-methods",
        requireRoleOrService(["admin", "system"]),
        createPaymentMethodsAdminRoutes(container.paymentMethodsController),
      );
      payRouter.use(
        "/admin/payments",
        requireRoleOrService(["admin", "system"]),
        createPaymentAdminRoutes(container.paymentAdminController),
      );
    } catch (error) {
      logger.warn(
        "Failed to mount payment routes, falling back to degraded handler:",
        error,
      );
      payRouter.all("/payments/*", (_req, res) => {
        res.status(503).json({
          success: false,
          error: "Payment routes unavailable",
          reason: "Initialization failure",
        });
      });
    }

    payRouter.use(
      "/system/maintenance",
      requireRoleOrService(["admin", "system"]),
      createMaintenanceRoutes(),
    );
  },
  routes: Router(),
  shutdown: async () => {
    logger.info("Shutting down payment-service module");
  },
};

// Exported for injection into PaymentProcessingSaga when instantiated by internal wiring
export { _eventIdempotency as eventIdempotency };
