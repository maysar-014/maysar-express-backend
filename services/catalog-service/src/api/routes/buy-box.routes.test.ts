import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { BuyBoxRoutes } from './buy-box.routes';

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

describe('BuyBoxRoutes', () => {
  it('registers buy-box fetch and compute endpoints', () => {
    const controller = {
      getBuyBox: jest.fn(),
      triggerCompute: jest.fn()
    };

    const router = new BuyBoxRoutes(controller as never).getRouter();
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /products/:productId/buy-box',
        'POST /products/:productId/buy-box/compute'
      ])
    );
  });

  it('delegates to buy-box controller methods', async () => {
    const controller = {
      getBuyBox: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getBuyBox' })),
      triggerCompute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'triggerCompute' }))
    };
    const app = express();
    app.use(express.json());
    app.use('/api', new BuyBoxRoutes(controller as never).getRouter());

    const getRes = await request(app).get('/api/products/product-1/buy-box');
    const postRes = await request(app).post('/api/products/product-1/buy-box/compute').send({ listings: [] });

    expect(getRes.status).toBe(200);
    expect(postRes.status).toBe(200);
    expect(controller.getBuyBox).toHaveBeenCalledTimes(1);
    expect(controller.triggerCompute).toHaveBeenCalledTimes(1);
  });
});
