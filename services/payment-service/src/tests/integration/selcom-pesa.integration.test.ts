import { SelcomPesaAdapter } from '../../infrastructure/providers/selcom-pesa.adapter';

describe('SelcomPesaAdapter integration placeholder', () => {
  it('does not call an external payment API yet', async () => {
    const adapter = new SelcomPesaAdapter({
      merchantCode: 'SEL-TEST',
      apiKey: 'SEL-TEST-KEY',
      baseUrl: 'https://selcom.example',
      callbackUrl: 'https://example.com/callback'
    });

    const result = await adapter.processPayment({
      paymentId: 'payment-1',
      amount: 1000,
      currency: 'TZS',
      method: 'CARD',
      customerInfo: {
        userId: 'user-1',
        email: 'buyer@example.com',
        phoneNumber: '+255700000001',
        name: 'Buyer One'
      }
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Selcom Pesa is not enabled yet');
  });
});
