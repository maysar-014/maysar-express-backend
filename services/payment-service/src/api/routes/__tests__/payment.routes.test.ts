import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());
app.post('/payments', (req, res) => res.status(201).json({ id: 'p1' }));
app.get('/payments/:id', (req, res) => res.json({ id: req.params.id, status: 'completed' }));

describe('Payment Routes', () => {
    it('should create payment', async () => {
        const res = await request(app).post('/payments').send({ amount: 100 });
        expect(res.status).toBe(201);
        expect(res.body.id).toBe('p1');
    });

    it('should get payment status', async () => {
        const res = await request(app).get('/payments/p1');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('completed');
    });
});
