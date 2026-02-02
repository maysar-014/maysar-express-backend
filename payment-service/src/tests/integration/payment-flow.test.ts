
import { createApp } from '../../src/app';
import request from 'supertest';
import { Container } from '../../src/container';

describe('Payment Flow Integration', () => {
    let app: any;
    let container: Container;

    beforeAll(() => {
        app = createApp();
        container = Container.getInstance();
    });

    it('should initiate a payment and trigger saga', async () => {
        const payload = {
            orderId: '00000000-0000-0000-0000-000000000001',
            userId: '00000000-0000-0000-0000-000000000002',
            amount: 1000,
            currency: 'TZS',
            method: 'MPESA',
            customerEmail: 'test@example.com',
            phoneNumber: '+255700000000'
        };

        const response = await request(app)
            .post('/api/payments')
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.paymentId).toBeDefined();
    });

    it('should get payment status by order ID', async () => {
        const orderId = '00000000-0000-0000-0000-000000000001';
        const response = await request(app)
            .get(`/api/payments/order/${orderId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
