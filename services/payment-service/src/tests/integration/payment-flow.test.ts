
import { createApp } from '../../app';
import type { Express } from 'express';
import request from 'supertest';

describe('Payment Flow Integration', () => {
    let app: Express;

    beforeAll(() => {
        app = createApp();
    });

    it('should reject invalid payment payload', async () => {
        const payload = {
            orderId: '00000000-0000-0000-0000-000000000001',
            userId: '00000000-0000-0000-0000-000000000002',
            amount: 0,
            currency: 'XXX',
            method: 'MPESA',
            customerEmail: 'test@example.com',
            phoneNumber: '+255700000000'
        };

        const response = await request(app)
            .post('/api/payments')
            .send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toBeDefined();
        expect(Object.keys(response.body).length).toBeGreaterThan(0);
    });

    it('should return not-found or server-error for unknown order ID', async () => {
        const orderId = '00000000-0000-0000-0000-000000000001';
        const response = await request(app)
            .get(`/api/payments/order/${orderId}`);

        expect([400, 404, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
    });
});
