import express from 'express';
import request from 'supertest';
import { healthRouter } from '../../api/routes/health.routes';

describe('Maps Service Health Routes Integration', () => {
  it('returns liveness payload from maps health router', async () => {
    const app = express();
    app.use('/health', healthRouter);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('maps-service');
  });
});

