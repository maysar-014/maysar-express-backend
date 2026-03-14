import { PesapalAdapter } from '../../infrastructure/providers/pesapal.adapter';

describe('Pesapal Integration', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('submits payment to pesapal endpoint and maps the response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        message: 'Hosted link created',
        data: {
          tracking_id: 'txn-12345',
          order_tracking_id: 'payment-1',
          merchant_reference: 'payment-1',
          redirect_url: 'https://pay.pesapal.com/iframe/abc',
          status: 'PENDING'
        }
      })
    } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new PesapalAdapter({
      secretKey: 'PESAPAL_TEST_KEY',
      baseUrl: 'https://api.pesapal.com/v3',
      callbackUrl: 'https://merchant.test/callback'
    });

    const result = await adapter.processPayment({
      paymentId: 'payment-1',
      amount: 15000,
      currency: 'TZS',
      method: 'CARD',
      customerInfo: {
        userId: 'user-1',
        email: 'user@example.com',
        phoneNumber: '+255700000001',
        name: 'Test User'
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.pesapal.com/v3/api/Transactions/SubmitOrderRequest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer PESAPAL_TEST_KEY'
        })
      })
    );
    expect(result.success).toBe(true);
    expect(result.providerReference).toBe('payment-1');
    expect(result.providerTransactionId).toBe('txn-12345');
    expect(result.redirectUrl).toContain('pay.pesapal.com');
  });
});
