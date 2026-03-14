
import { createApp } from '../../app';
import type { Express } from 'express';
import request from 'supertest';

describe('Wallet Integration', () => {
    let app: Express;
    const userId = '00000000-0000-0000-0000-000000000002';

    beforeAll(() => {
        app = createApp();
    });

    it('should return 404 for non-existent wallet', async () => {
        const response = await request(app)
            .get(`/api/wallets/non-existent-user`);

        expect(response.status).toBe(404);
    });

    it('should not expose wallet credit endpoint in payment-service', async () => {
        const response = await request(app)
            .post(`/api/wallets/${userId}/credit`)
            .send({
                amount: 5000,
                description: 'Test credit'
            });

        expect(response.status).toBe(404);
    });
});
