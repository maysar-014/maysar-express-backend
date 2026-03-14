import express from 'express';
import request from 'supertest';
import { healthRoutes } from '../../api/routes/health.routes';

describe('Inventory Service Health Routes Integration', () => {
  it('returns liveness response', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.body.service).toBe('inventory-service');
  });
});

