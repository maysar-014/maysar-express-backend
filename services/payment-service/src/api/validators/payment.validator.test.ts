import {
  createPaymentSchema,
  getPaymentSchema,
  refundPaymentSchema
} from './payment.validator';

describe('payment.validator', () => {
  it('parses valid create payment payload and applies defaults', () => {
    const parsed = createPaymentSchema.parse({
      body: {
        orderId: 'MSR-ORD-20260408-173921-9500',
        amount: 15000,
        method: 'MOBILE_MONEY',
        phoneNumber: '+255712345678'
      }
    });

    expect(parsed.body.currency).toBe('TZS');
    expect(parsed.body.method).toBe('MOBILE_MONEY');
  });

  it('rejects invalid create payment payload', () => {
    expect(() =>
      createPaymentSchema.parse({
        body: {
          orderId: 'bad-order-id',
          amount: -1,
          method: 'UNKNOWN'
        }
      })
    ).toThrow();
  });

  it('parses refund and get payment payloads', () => {
    const refund = refundPaymentSchema.parse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: { reason: 'Customer request', amount: 1000 }
    });
    const get = getPaymentSchema.parse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' }
    });

    expect(refund.body.reason).toBe('Customer request');
    expect(get.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
