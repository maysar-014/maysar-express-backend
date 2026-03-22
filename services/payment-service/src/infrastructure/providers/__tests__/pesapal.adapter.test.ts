import { PesapalAdapter } from '../pesapal.adapter';

global.fetch = jest.fn();

describe('PesapalAdapter', () => {
    let adapter: PesapalAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new PesapalAdapter({
            consumerKey: 'PESAPAL_TEST_CONSUMER_KEY',
            consumerSecret: 'PESAPAL_TEST_CONSUMER_SECRET',
            ipnId: 'ipn_123',
            baseUrl: 'https://api.pesapal.com/v3'
        });
    });

    it('should process payment', async () => {
        (fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: 'access-token-123',
                    expires_in: 300
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'ok',
                    data: {
                        tracking_id: 'txn-777',
                        order_tracking_id: 'pay_1',
                        merchant_reference: 'pay_1',
                        redirect_url: 'https://pay.pesapal.com/iframe/test'
                    }
                })
            });

        const result = await adapter.processPayment({
            paymentId: 'pay_1',
            amount: 100,
            currency: 'KES',
            method: 'CARD',
            customerInfo: { userId: 'user-1' }
        });
        expect(result.success).toBe(true);
        expect(result.providerTransactionId).toBe('txn-777');
        expect(fetch).toHaveBeenNthCalledWith(
            1,
            'https://api.pesapal.com/v3/api/Auth/RequestToken',
            expect.objectContaining({ method: 'POST' })
        );
        expect(fetch).toHaveBeenNthCalledWith(
            2,
            'https://api.pesapal.com/v3/api/Transactions/SubmitOrderRequest',
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer access-token-123' }),
                body: expect.stringContaining('"notification_id":"ipn_123"')
            })
        );
    });

    it('should handle errors', async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
        const result = await adapter.processPayment({
            paymentId: 'pay_1',
            amount: 100,
            currency: 'KES',
            method: 'CARD',
            customerInfo: { userId: 'user-1' }
        });
        expect(result.success).toBe(false);
    });

    it('should return a deterministic response for contract-test requests', async () => {
        const result = await adapter.processPayment({
            paymentId: 'pay_1',
            amount: 100,
            currency: 'KES',
            method: 'CARD',
            customerInfo: { userId: 'user-1' },
            metadata: { contractTest: true }
        });

        expect(result.success).toBe(true);
        expect(result.providerReference).toBe('pay_1');
        expect(fetch).not.toHaveBeenCalled();
    });
});
