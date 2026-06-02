import express from 'express';
import request from 'supertest';
import type { Router } from 'express';
import { createWebhookRoutes } from './webhook.routes';
import { WebhookController } from '../controllers/webhook.controller';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (router: Router): string[] => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

describe('createWebhookRoutes', () => {
  it('registers the generic payment webhook endpoint', () => {
    const controller = { handlePaymentWebhook: jest.fn() };
    const signatures = getRouteSignatures(createWebhookRoutes(controller as never));

    expect(signatures).toEqual(expect.arrayContaining(['POST /payment-gateway']));
  });

  it('returns 410 while the payment webhook integration is disabled', async () => {
    const app = express();
    const controller = new WebhookController({ handleWebhook: jest.fn(), getProviderName: jest.fn().mockReturnValue('selcom-pesa') } as never);
    app.use('/webhooks', createWebhookRoutes(controller));

    const response = await request(app)
      .post('/webhooks/payment-gateway')
      .send({ status: 'successful' });

    expect(response.status).toBe(410);
    expect(response.body.error).toContain('disabled');
  });
});
