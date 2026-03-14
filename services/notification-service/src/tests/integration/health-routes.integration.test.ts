import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../api/routes/health.routes';

describe('Notification Service Health Routes Integration', () => {
  it('returns liveness status', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.uptime).toBeDefined();
  });
});

