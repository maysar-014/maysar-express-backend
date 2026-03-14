import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../api/routes/health.routes';

describe('Wallet Service Health Routes Integration', () => {
  it('returns service liveness from wallet health router', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('wallet-service');
  });
});

