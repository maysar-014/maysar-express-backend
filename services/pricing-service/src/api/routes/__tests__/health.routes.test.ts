import request from 'supertest';
import express from 'express';

const app = express();
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'pricing-service' }));

describe('Health Routes', () => {
    it('should return healthy status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
    });
});
