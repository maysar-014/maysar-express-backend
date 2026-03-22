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
  const authHeaders = {
    'x-contract-test': '1',
    'x-user-id': 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    'x-user-roles': 'buyer'
  };

  const validDiscussionPayload = {
    topic: 'How can sellers reduce failed deliveries?',
    content: 'I am looking for practical steps that help sellers reduce failed deliveries, improve buyer communication, and keep courier handoffs consistent across busy order periods.',
    category: 'logistics',
    expertiseLevel: 'INTERMEDIATE',
    industry: ['commerce'],
    businessStage: 'growth',
    tags: ['delivery', 'operations'],
    maxResponsesPerUser: 5
  };

  const validAnswerPayload = {
    content: 'Start by confirming customer availability before dispatch, capturing landmarks early, and aligning courier handoff notes so repeat delivery attempts are less likely.'
  };

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

    const createRes = await request(app)
      .post('/discussions')
      .set(authHeaders)
      .send(validDiscussionPayload);
    const answerRes = await request(app)
      .post('/discussions/thread-1/answers')
      .set(authHeaders)
      .send(validAnswerPayload);

    expect(createRes.status).toBe(201);
    expect(answerRes.status).toBe(201);
    expect(controller.createDiscussion).toHaveBeenCalledTimes(1);
    expect(controller.submitAnswer).toHaveBeenCalledTimes(1);
  });
});
