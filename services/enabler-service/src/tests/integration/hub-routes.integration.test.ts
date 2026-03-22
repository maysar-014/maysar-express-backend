import express from 'express';
import request from 'supertest';
import hubRoutes from '../../api/routes/hub.routes';

describe('Enabler Service Hub Routes Integration', () => {
  it('requires authentication before serving enabler hub products', async () => {
    const app = express();
    app.use('/hub', hubRoutes);

    const unauthenticated = await request(app).get('/hub/products');
    const authenticated = await request(app)
      .get('/hub/products')
      .set('x-contract-test', '1')
      .set('x-user-id', 'usr_test_0001')
      .set('x-user-roles', 'enabler');

    expect(unauthenticated.status).toBe(401);
    expect(authenticated.status).toBe(200);
    expect(authenticated.body.message).toContain('Browse Enabler Hub');
  });
});

