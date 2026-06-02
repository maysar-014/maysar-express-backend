import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export function createWebhookRoutes(webhookController: WebhookController): Router {
  const router = Router();

  router.post(
    '/payment-gateway',
    (req, res) => webhookController.handlePaymentWebhook(req, res)
  );

  return router;
}

