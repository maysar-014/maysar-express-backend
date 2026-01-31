import request from 'supertest';
import express from 'express';

describe('API Performance', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        // Simulate some processing
        app.get('/perf', async (req, res) => {
            await new Promise(r => setTimeout(r, 10)); // 10ms delay
            res.send('ok');
        });
    });

    it('should respond within acceptable limits', async () => {
        const iterations = 50;
        const start = Date.now();

        const promises = [];
        for (let i = 0; i < iterations; i++) {
            promises.push(request(app).get('/perf'));
        }

        await Promise.all(promises);
        const duration = Date.now() - start;
        const avgTime = duration / iterations;

        // This is a naive test since requests run in parallel, 
        // validating throughput rather than just individual response latency.
        // But ensures the system doesn't choke completely.
        expect(avgTime).toBeLessThan(200); // Threshold
    });
});
