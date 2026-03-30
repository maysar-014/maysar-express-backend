import request from 'supertest';
import express from 'express';
import healthRoutes from './health.routes';

const app = express();
app.use('/health', healthRoutes);

describe('Health Routes', () => {
  it('should return 200 on health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('should return service info', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toHaveProperty('service');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should expose readiness and liveness checks', async () => {
    await request(app).get('/health/ready').expect(200);
    await request(app).get('/health/live').expect(200);
  });
});
