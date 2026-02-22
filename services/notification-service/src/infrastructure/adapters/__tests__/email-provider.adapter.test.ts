import { EmailProviderAdapter } from '../email-provider.adapter';

global.fetch = jest.fn();

describe('EmailProviderAdapter', () => {
    let adapter: EmailProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new EmailProviderAdapter({ apiKey: 'test-key' });
    });

    it('should send email successfully', async () => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'email-123', status: 'sent' })
        });

        const result = await adapter.send({
            to: 'test@example.com',
            subject: 'Test',
            body: 'Test body'
        });

        expect(result.success).toBe(true);
    });

    it('should handle send failure', async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await adapter.send({
            to: 'test@example.com',
            subject: 'Test',
            body: 'Test body'
        });

        expect(result.success).toBe(false);
    });
});
