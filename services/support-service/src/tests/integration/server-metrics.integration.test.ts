import request from 'supertest';
import { Container } from 'inversify';
import { createServer } from '../../app';

describe('Support Service Server Integration', () => {
  it('serves prometheus metrics endpoint', async () => {
    const app = createServer(new Container());

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('#');
  });
});

