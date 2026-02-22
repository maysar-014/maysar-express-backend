import { PesapalAdapter } from '../pesapal.adapter';

global.fetch = jest.fn();

describe('PesapalAdapter', () => {
    let adapter: PesapalAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new PesapalAdapter({ consumerKey: 'key', consumerSecret: 'secret' });
    });

    it('should process payment', async () => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'success', transactionId: 'tx1' })
        });

        const result = await adapter.processPayment({ amount: 100, currency: 'KES' });
        expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
        const result = await adapter.processPayment({ amount: 100, currency: 'KES' });
        expect(result.success).toBe(false);
    });
});
