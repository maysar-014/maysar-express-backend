import express from 'express';
import request from 'supertest';
import type { Router } from 'express';
import { createWebhookRoutes } from './webhook.routes';

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
  it('registers the pesapal webhook endpoint', () => {
    const controller = { handlePesapalWebhook: jest.fn() };
    const signatures = getRouteSignatures(createWebhookRoutes(controller as never));

    expect(signatures).toEqual(expect.arrayContaining(['POST /pesapal']));
  });

  it('delegates webhook requests to the controller handler', async () => {
    const handlePesapalWebhook = jest.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = express();
    app.use('/webhooks', createWebhookRoutes({ handlePesapalWebhook } as never));

    const response = await request(app)
      .post('/webhooks/pesapal')
      .set('x-webhook-idempotency-key', 'test-webhook-key')
      .send({ OrderTrackingId: 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV', status: 'successful' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(handlePesapalWebhook).toHaveBeenCalledTimes(1);
  });

  it('rejects explicit null OrderNotificationType values', async () => {
    const handlePesapalWebhook = jest.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = express();
    app.use('/webhooks', createWebhookRoutes({ handlePesapalWebhook } as never));

    const response = await request(app)
      .post('/webhooks/pesapal')
      .set('x-webhook-idempotency-key', 'test-webhook-key')
      .send({
        OrderTrackingId: 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        OrderNotificationType: null,
        status: 'COMPLETED'
      });

    expect(response.status).toBe(400);
    expect(handlePesapalWebhook).not.toHaveBeenCalled();
  });

  it('rejects non-string OrderMerchantReference values', async () => {
    const handlePesapalWebhook = jest.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = express();
    app.use('/webhooks', createWebhookRoutes({ handlePesapalWebhook } as never));

    const response = await request(app)
      .post('/webhooks/pesapal')
      .set('x-webhook-idempotency-key', 'test-webhook-key')
      .send({
        OrderTrackingId: 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        OrderMerchantReference: {},
        OrderNotificationType: 'CHANGE',
        status: 'COMPLETED'
      });

    expect(response.status).toBe(400);
    expect(handlePesapalWebhook).not.toHaveBeenCalled();
  });

  it('rejects non-string OrderTrackingId values', async () => {
    const handlePesapalWebhook = jest.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = express();
    app.use('/webhooks', createWebhookRoutes({ handlePesapalWebhook } as never));

    const response = await request(app)
      .post('/webhooks/pesapal')
      .set('x-webhook-idempotency-key', 'test-webhook-key')
      .send({
        OrderTrackingId: 0,
        OrderMerchantReference: 'pay_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        OrderNotificationType: 'CHANGE',
        status: 'COMPLETED'
      });

    expect(response.status).toBe(400);
    expect(handlePesapalWebhook).not.toHaveBeenCalled();
  });
});

