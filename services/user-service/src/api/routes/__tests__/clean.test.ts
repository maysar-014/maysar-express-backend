import request from 'supertest';
import express from 'express';

describe('Clean Integration Test', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.get('/test', (req, res) => res.status(200).json({ ok: true }));
    });

    it('should respond with 200', async () => {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
    });
});
