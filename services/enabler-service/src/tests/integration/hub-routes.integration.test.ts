import express from 'express';
import request from 'supertest';
import hubRoutes from '../../api/routes/hub.routes';

describe('Enabler Service Hub Routes Integration', () => {
  it('exposes public enabler hub products endpoint', async () => {
    const app = express();
    app.use('/hub', hubRoutes);

    const response = await request(app).get('/hub/products');

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Browse Enabler Hub');
  });
});

