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
    const controller = { handlePesapalIpn: jest.fn() };
    const signatures = getRouteSignatures(createWebhookRoutes(controller as never));

    expect(signatures).toEqual(expect.arrayContaining(['GET /pesapal']));
  });

  it('delegates webhook requests to the controller handler', async () => {
    const handlePesapalIpn = jest.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = express();
    app.use('/webhooks', createWebhookRoutes({ handlePesapalIpn } as never));

    const response = await request(app).get('/webhooks/pesapal');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(handlePesapalIpn).toHaveBeenCalledTimes(1);
  });
});
