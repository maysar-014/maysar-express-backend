import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../api/routes/health.routes';

describe('Checkout Service Health Routes Integration', () => {
  it('returns liveness payload from checkout health routes', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('checkout-service');
  });
});

