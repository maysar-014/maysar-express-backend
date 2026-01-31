import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

describe('API Security', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(helmet());
        app.get('/test', (req, res) => res.send('ok'));
    });

    it('should set security headers', async () => {
        const res = await request(app).get('/test');

        expect(res.headers['x-dns-prefetch-control']).toBe('off');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['strict-transport-security']).toBeDefined();
    });
});
