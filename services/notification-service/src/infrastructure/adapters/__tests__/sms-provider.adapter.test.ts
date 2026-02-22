import { SmsProviderAdapter } from '../sms-provider.adapter';

describe('SmsProviderAdapter', () => {
    let adapter: SmsProviderAdapter;

    beforeEach(() => {
        adapter = new SmsProviderAdapter({ apiKey: 'test-key' });
    });

    it('should send SMS successfully', async () => {
        const result = await adapter.send({
            to: '+254712345678',
            message: 'Test message'
        });

        expect(result).toBeDefined();
    });
});
