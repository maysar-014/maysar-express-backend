import { createPayoutSchema, getPayoutSchema } from './payout.validator';

describe('payout.validator', () => {
  it('parses a valid create payout request and applies defaults', () => {
    const parsed = createPayoutSchema.parse({
      body: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 45000,
        method: 'MOBILE_MONEY',
        accountNumber: '255712345678',
        accountName: 'Amina Seller'
      }
    });

    expect(parsed.body.currency).toBe('TZS');
    expect(parsed.body.amount).toBe(45000);
    expect(parsed.body.method).toBe('MOBILE_MONEY');
  });

  it('rejects invalid create payout requests', () => {
    expect(() =>
      createPayoutSchema.parse({
        body: {
          userId: 'bad-user-id',
          amount: -1,
          method: 'MOBILE_MONEY',
          accountNumber: '255700000000',
          accountName: 'Bad Request'
        }
      })
    ).toThrow();
  });

  it('parses a valid get payout request', () => {
    const parsed = getPayoutSchema.parse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' }
    });

    expect(parsed.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
