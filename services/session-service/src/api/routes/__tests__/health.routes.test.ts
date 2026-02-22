import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../health.routes';

const app = express();
app.use('/health', healthRoutes);

describe('Health Routes', () => {
    describe('GET /health', () => {
        it('should return healthy status', async () => {
            const res = await request(app).get('/health');
            
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'healthy',
                service: 'session-service',
                timestamp: expect.any(String),
                uptime: expect.stringMatching(/^\d+s$/)
            });
        });
    });

    describe('GET /health/ready', () => {
        it('should return ready status', async () => {
            const res = await request(app).get('/health/ready');
            
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'ready',
                service: 'session-service',
                timestamp: expect.any(String)
            });
        });
    });

    describe('GET /health/live', () => {
        it('should return alive status', async () => {
            const res = await request(app).get('/health/live');
            
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'alive',
                service: 'session-service',
                timestamp: expect.any(String)
            });
        });
    });
});
