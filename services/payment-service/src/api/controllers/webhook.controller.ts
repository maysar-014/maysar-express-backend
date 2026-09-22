import { Request, Response } from "express";
import {
  IPaymentProvider,
  WebhookPayload,
} from "../../domain/repositories/payment-provider.gateway";
import { logger } from "../../infrastructure/services/logger.service";
import { extractPaymentWebhookRequest } from "./payment-webhook.utils";

export class WebhookController {
  constructor(
    private readonly paymentGateway: IPaymentProvider,
    private readonly handlePaymentWebhookUseCase?: {
      execute(
        providerReference: string,
        providerTransactionId: string,
        paymentStatus: string,
        payload: WebhookPayload,
      ): Promise<unknown>;
    },
  ) {}

  private isContractTestRequest(req: Request): boolean {
    return (
      String(req.headers?.["x-contract-test"] || "").trim() === "1" &&
      process.env.NODE_ENV !== "production"
    );
  }

  async handlePaymentWebhook(req: Request, res: Response): Promise<void> {
    if (!this.handlePaymentWebhookUseCase) {
      res.status(410).json({
        error: "Payment webhook integration is currently disabled",
        provider: this.paymentGateway.getProviderName(),
      });
      return;
    }

    try {
      const {
        parsedBody,
        providerReference,
        providerTransactionId,
        paymentStatus,
        merchantReference,
        notificationType,
      } = extractPaymentWebhookRequest(req);

      if (!providerReference) {
        logger.warn("Missing webhook parameters", {
          body: parsedBody,
          query: req.query,
        });
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }

      const webhookPayload: WebhookPayload = {
        eventType: "payment.status.update",
        providerReference,
        status: paymentStatus,
        amount: 0,
        currency: "TZS",
        timestamp: new Date(),
        metadata: {
          transactionId: providerTransactionId,
          merchantReference,
          notificationType,
          contractTest: this.isContractTestRequest(req),
          rawBody: parsedBody,
          rawQuery: req.query,
        },
      };

      await this.paymentGateway.handleWebhook(webhookPayload);

      const result = await this.handlePaymentWebhookUseCase.execute(
        providerReference,
        providerTransactionId ?? providerReference,
        paymentStatus,
        webhookPayload,
      );

      logger.info(
        "Webhook processed successfully",
        result as Record<string, unknown>,
      );
      res.status(200).json({ status: "OK" });
    } catch (error) {
      logger.error("Webhook processing failed", { error });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
