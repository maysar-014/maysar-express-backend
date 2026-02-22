import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());
app.post('/tickets', (req, res) => res.status(201).json({ id: 't1' }));
app.get('/tickets/:id', (req, res) => res.json({ id: req.params.id }));

describe('Ticket Routes', () => {
    it('should create ticket', async () => {
        const res = await request(app).post('/tickets').send({ subject: 'Issue' });
        expect(res.status).toBe(201);
    });

    it('should get ticket', async () => {
        const res = await request(app).get('/tickets/t1');
        expect(res.body.id).toBe('t1');
    });
});
