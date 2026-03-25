import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';

const mockCreateDispute = jest.fn(async (_req: Request, res: Response) => {
  res.status(201).json({ action: 'createDispute' });
});
const mockListDisputes = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'listDisputes' });
});
const mockGetDispute = jest.fn(async (req: Request, res: Response) => {
  res.status(200).json({ action: 'getDispute', id: req.params.id });
});
const mockEscalateDispute = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'escalateDispute' });
});
const mockAddEvidence = jest.fn(async (_req: Request, res: Response) => {
  res.status(201).json({ action: 'addEvidence' });
});

const mockController = {
  createDispute: mockCreateDispute,
  listDisputes: mockListDisputes,
  getDispute: mockGetDispute,
  escalateDispute: mockEscalateDispute,
  addEvidence: mockAddEvidence
};

const mockContainerGet = jest.fn().mockReturnValue(mockController);

jest.mock('../../../infrastructure/container', () => ({
  container: {
    get: (...args: unknown[]) => mockContainerGet(...args)
  }
}));

jest.mock('../../middleware/validate.middleware', () => ({
  validate: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
  validateQuery: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  authorize: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

import { disputeRouter } from '../dispute.routes';

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

describe('disputeRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers dispute workflow endpoints', () => {
    const signatures = getRouteSignatures(disputeRouter);
    expect(signatures).toEqual(expect.arrayContaining([
      'POST /',
      'GET /',
      'GET /:id',
      'POST /:id/escalate',
      'POST /:id/evidence'
    ]));
  });

  it('delegates dispute workflow requests to the controller', async () => {
    const app = express();
    app.use(express.json());
    app.use('/disputes', disputeRouter);

    const createRes = await request(app).post('/disputes').send({
      orderId: 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      reason: 'Wrong item delivered',
      description: 'The seller shipped a different item than the one ordered.'
    });
    const listRes = await request(app).get('/disputes');
    const getRes = await request(app).get('/disputes/disp_1');
    const escalateRes = await request(app).post('/disputes/disp_1/escalate').send({ reason: 'Needs admin review' });
    const evidenceRes = await request(app).post('/disputes/disp_1/evidence').send({
      note: 'Attaching delivery photo',
      attachments: [
        {
          fileName: 'photo.jpg',
          fileUrl: 'https://example.com/photo.jpg',
          fileSize: 1200,
          mimeType: 'image/jpeg'
        }
      ]
    });

    expect(createRes.status).toBe(201);
    expect(listRes.status).toBe(200);
    expect(getRes.status).toBe(200);
    expect(escalateRes.status).toBe(200);
    expect(evidenceRes.status).toBe(201);
    expect(mockCreateDispute).toHaveBeenCalledTimes(1);
    expect(mockListDisputes).toHaveBeenCalledTimes(1);
    expect(mockGetDispute).toHaveBeenCalledTimes(1);
    expect(mockEscalateDispute).toHaveBeenCalledTimes(1);
    expect(mockAddEvidence).toHaveBeenCalledTimes(1);
  });
});
