import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';

const mockCreateAgent = jest.fn(async (_req: Request, res: Response) => {
  res.status(201).json({ action: 'createAgent' });
});
const mockUpdateAgent = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'updateAgent' });
});
const mockController = {
  createAgent: mockCreateAgent,
  updateAgent: mockUpdateAgent
};
const mockContainerGet = jest.fn().mockReturnValue(mockController);

jest.mock('../../infrastructure/container', () => ({
  container: {
    get: (...args: unknown[]) => mockContainerGet(...args)
  }
}));

jest.mock('../middleware/validate.middleware', () => ({
  validate: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  authorize: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

import { agentRouter } from './agent.routes';

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

describe('agentRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers agent create and update endpoints', () => {
    const signatures = getRouteSignatures(agentRouter);
    expect(signatures).toEqual(expect.arrayContaining(['POST /', 'PUT /:id']));
  });

  it('delegates route handlers to the controller from container', async () => {
    const app = express();
    app.use(express.json());
    app.use('/agents', agentRouter);

    const createRes = await request(app).post('/agents').send({
      userId: '550e8400-e29b-41d4-a716-446655440000'
    });
    const updateRes = await request(app).put('/agents/agent-1').send({ isAvailable: true });

    expect(createRes.status).toBe(201);
    expect(updateRes.status).toBe(200);
    expect(mockCreateAgent).toHaveBeenCalledTimes(1);
    expect(mockUpdateAgent).toHaveBeenCalledTimes(1);
  });
});
