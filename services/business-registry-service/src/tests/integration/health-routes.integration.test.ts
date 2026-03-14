import express from 'express';
import request from 'supertest';
import { createHealthRoutes } from '../../api/routes/health.routes';

describe('Business Registry Health Routes Integration', () => {
  it('returns live status without dependency checks', async () => {
    const app = express();
    app.use('/health', createHealthRoutes());

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
  });
});

