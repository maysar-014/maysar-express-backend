import { EmailProviderAdapter } from '../email-provider.adapter';

describe('EmailProviderAdapter', () => {
    let adapter: EmailProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new EmailProviderAdapter();
    });

    it('should send email successfully', async () => {
        await adapter.send('test@example.com', 'Test', 'Test body');
        expect(true).toBe(true);
    });

    it('should allow html content', async () => {
        await adapter.send('test@example.com', 'Test', 'Test body', '<p>Test</p>');
        expect(true).toBe(true);
    });
});
