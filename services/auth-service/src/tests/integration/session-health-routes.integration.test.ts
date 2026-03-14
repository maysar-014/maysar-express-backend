import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../session/api/routes/health.routes';

describe('Auth Service Session Health Routes Integration', () => {
  it('returns liveness payload from mounted health router', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('session-service');
  }, 60000);
});
