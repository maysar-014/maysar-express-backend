import request from 'supertest';
import { Container } from 'inversify';
import { createServer } from '../../app';

describe('Production Service Server Integration', () => {
  it('exposes metrics endpoint through server configuration', async () => {
    const app = createServer(new Container());

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('#');
  });
});

