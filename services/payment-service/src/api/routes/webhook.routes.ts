import { Router } from 'express';
import express from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export function createWebhookRoutes(webhookController: WebhookController): Router {
  const router = Router();

  router.get('/pesapal', express.raw({ type: '*/*' }), (req, res) => webhookController.handlePesapalIpn(req, res));

  return router;
}
