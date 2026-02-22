import { PushProviderAdapter } from '../push-provider.adapter';

describe('PushProviderAdapter', () => {
    let adapter: PushProviderAdapter;

    beforeEach(() => {
        adapter = new PushProviderAdapter({ apiKey: 'test-key' });
    });

    it('should send push notification', async () => {
        const result = await adapter.send({
            to: 'device-token',
            title: 'Test',
            body: 'Test body'
        });

        expect(result).toBeDefined();
    });
});
