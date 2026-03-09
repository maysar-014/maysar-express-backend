import express from 'express';
import request from 'supertest';
import type { Router, Request, Response, NextFunction } from 'express';
import { createDiscussionsRouter } from './discussions.routes';

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

describe('createDiscussionsRouter', () => {
  it('registers discussion routes and answer workflows', () => {
    const controller = {
      createDiscussion: jest.fn(),
      listDiscussions: jest.fn(),
      getDiscussion: jest.fn(),
      submitAnswer: jest.fn(),
      acceptAnswer: jest.fn(),
      closeDiscussion: jest.fn()
    };
    const signatures = getRouteSignatures(createDiscussionsRouter(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /',
        'GET /:threadId',
        'POST /:threadId/answers',
        'PATCH /:threadId/accept/:answerId',
        'PATCH /:threadId/close'
      ])
    );
  });

  it('delegates representative requests to the discussions controller', async () => {
    const controller = {
      createDiscussion: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(201).json({ action: 'createDiscussion' })),
      listDiscussions: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(200).json({ action: 'listDiscussions' })),
      getDiscussion: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(200).json({ action: 'getDiscussion' })),
      submitAnswer: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(201).json({ action: 'submitAnswer' })),
      acceptAnswer: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(200).json({ action: 'acceptAnswer' })),
      closeDiscussion: jest.fn(async (_req: Request, res: Response, _next: NextFunction) => res.status(200).json({ action: 'closeDiscussion' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/discussions', createDiscussionsRouter(controller as never));

    const createRes = await request(app).post('/discussions').send({});
    const answerRes = await request(app).post('/discussions/thread-1/answers').send({});

    expect(createRes.status).toBe(201);
    expect(answerRes.status).toBe(201);
    expect(controller.createDiscussion).toHaveBeenCalledTimes(1);
    expect(controller.submitAnswer).toHaveBeenCalledTimes(1);
  });
});
