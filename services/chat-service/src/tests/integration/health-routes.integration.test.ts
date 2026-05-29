import express from 'express';
import request from 'supertest';

import { healthRoutes } from '../../api/routes/health.routes';

describe('chat-service health routes integration', () => {
  it('returns health status', async () => {
    const app = express();
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'chat-service'
    });
  });
});
