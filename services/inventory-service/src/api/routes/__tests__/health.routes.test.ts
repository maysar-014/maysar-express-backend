import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../health.routes';

const app = express();
app.use('/health', healthRoutes);

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'inventory-service'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ready',
        service: 'inventory-service'
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'alive',
        service: 'inventory-service'
      });
    });
  });
});
