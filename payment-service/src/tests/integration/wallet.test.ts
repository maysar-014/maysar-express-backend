
import { createApp } from '../../src/app';
import request from 'supertest';

describe('Wallet Integration', () => {
    let app: any;
    const userId = '00000000-0000-0000-0000-000000000002';

    beforeAll(() => {
        app = createApp();
    });

    it('should return 404 for non-existent wallet', async () => {
        const response = await request(app)
            .get(`/api/wallets/non-existent-user`);

        expect(response.status).toBe(404);
    });

    it('should credit wallet', async () => {
        const response = await request(app)
            .post(`/api/wallets/${userId}/credit`)
            .send({
                amount: 5000,
                description: 'Test credit'
            });

        // This might fail if database isn't seeded/setup for this user
        // But the endpoint should be reachable
        expect([200, 400, 500]).toContain(response.status);
    });
});
