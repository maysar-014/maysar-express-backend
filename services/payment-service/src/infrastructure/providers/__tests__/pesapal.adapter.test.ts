import { PesapalAdapter } from '../pesapal.adapter';

global.fetch = jest.fn();

describe('PesapalAdapter', () => {
    let adapter: PesapalAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new PesapalAdapter({ secretKey: 'PESAPAL_TEST_KEY', baseUrl: 'https://api.pesapal.com/v3' });
    });

    it('should process payment', async () => {
        (fetch as jest.Mock).mockResolvedValue({
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
});
