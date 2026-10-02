
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
            orderId: 'ORD-20260101-3C8B',
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

    it('should reject anonymous payment lookups before any record read', async () => {
        const orderId = 'ORD-20300101-3C8B';
        const response = await request(app)
            .get('/api/payments/order/' + orderId);

        // No caller identity — the read guard answers 401 before the lookup, so
        // payment ids cannot be probed for existence.
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should return not-found or server-error for unknown order ID', async () => {
        const orderId = 'ORD-20300101-3C8B';
        const response = await request(app)
            .get(`/api/payments/order/${orderId}`)
            .set('x-user-id', 'usr_int_test_buyer')
            .set('x-user-roles', 'buyer');

        expect([400, 404, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
    });
});
