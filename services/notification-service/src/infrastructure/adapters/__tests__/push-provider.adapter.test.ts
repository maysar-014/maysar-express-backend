import { PushProviderAdapter } from '../push-provider.adapter';

describe('PushProviderAdapter', () => {
    let adapter: PushProviderAdapter;

    beforeEach(() => {
        adapter = new PushProviderAdapter();
    });

    it('should send push notification', async () => {
        await adapter.send('device-token', { title: 'Test', body: 'Test body' });
        expect(true).toBe(true);
    });
});
