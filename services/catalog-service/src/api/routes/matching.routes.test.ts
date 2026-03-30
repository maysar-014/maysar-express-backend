import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { MatchingRoutes } from './matching.routes';

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next()
}));

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

describe('MatchingRoutes', () => {
  it('registers matching endpoints', () => {
    const controller = {
      matchProduct: jest.fn(),
      confirmMatch: jest.fn(),
      getPendingConfirmations: jest.fn(),
      getMatchAudit: jest.fn()
    };

    const router = new MatchingRoutes(controller as never).getRouter();
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /match',
        'POST /match/confirm/:confirmationId',
        'GET /match/pending',
        'GET /match/audit/:productId'
      ])
    );
  });

  it('delegates route calls to product matching controller', async () => {
    const controller = {
      matchProduct: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'matchProduct' })),
      confirmMatch: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'confirmMatch' })),
      getPendingConfirmations: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getPendingConfirmations' })),
      getMatchAudit: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getMatchAudit' }))
    };
    const app = express();
    app.use(express.json());
    app.use('/api', new MatchingRoutes(controller as never).getRouter());

    const matchRes = await request(app).post('/api/match').send({});
    const pendingRes = await request(app).get('/api/match/pending');

    expect(matchRes.status).toBe(200);
    expect(pendingRes.status).toBe(200);
    expect(controller.matchProduct).toHaveBeenCalledTimes(1);
    expect(controller.getPendingConfirmations).toHaveBeenCalledTimes(1);
  });
});
