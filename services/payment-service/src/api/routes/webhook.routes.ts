import { Router } from 'express';
import express from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { requireWebhookIdempotencyKey, validatePesapalWebhookRequest } from './pesapal-webhook.middleware';

export function createWebhookRoutes(webhookController: WebhookController): Router {
  const router = Router();

  router.post(
    '/pesapal',
    express.raw({ type: '*/*' }),
    requireWebhookIdempotencyKey,
    validatePesapalWebhookRequest,
    (req, res) => webhookController.handlePesapalWebhook(req, res)
  );

  return router;
}

