import express from 'express';
import request from 'supertest';
import { createHealthRoutes } from '../../api/routes/health.routes';

describe('Training Service Health Routes Integration', () => {
  it('mounts health endpoint and returns controller response', async () => {
    const app = express();
    const controller = {
      check: (_req: express.Request, res: express.Response) => {
        res.status(200).json({ status: 'healthy', service: 'training-service' });
      }
    } as any;

    app.use('/health', createHealthRoutes(controller));

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});

