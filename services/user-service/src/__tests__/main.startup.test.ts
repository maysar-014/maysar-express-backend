import request from 'supertest';
import application from '../..//src/main';

describe('UserServiceApplication (main.ts)', () => {
  const app = application.getApp();

  test('GET / returns service metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service', 'User Service');
    expect(res.body).toHaveProperty('endpoints');
    expect(res.body.endpoints).toHaveProperty('health', '/health');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('unknown route returns 404 JSON from wildcard handler', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not Found');
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Route GET');
  });

  test('CORS allows known origins', async () => {
    const origin = 'http://localhost:3000';
    const res = await request(app).get('/').set('Origin', origin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  test('CORS allows live and staging origins', async () => {
    const origins = [
      'https://maysar.co.tz',
      'https://maysar-web-app-maysar-014-maysar-014s-projects.vercel.app'
    ];

    for (const origin of origins) {
      const res = await request(app).get('/').set('Origin', origin);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
  });

  test('CORS denies unknown origins (returns error)', async () => {
    const origin = 'http://evil.com';
    const res = await request(app).get('/').set('Origin', origin);
    // CORS middleware will pass an error into the handler chain
    expect([400, 403, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('error');
  });
});
