import {
  creditWalletSchema as paymentCreditWalletSchema,
  debitWalletSchema as paymentDebitWalletSchema,
  getWalletSchema as paymentGetWalletSchema
} from '../../../../payment-service/src/api/validators/wallet.validator';
import { WalletValidator } from './wallet.validator';

describe('wallet validator schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('validates wallet-service Joi credit/debit payloads', () => {
    const credit = WalletValidator.creditWallet.validate({
      userId: validUuid,
      amount: 100,
      currency: 'TZS',
      idempotencyKey: 'idem-1',
      correlationId: validUuid
    });
    const debit = WalletValidator.debitWallet.validate({
      userId: validUuid,
      amount: 50,
      currency: 'TZS',
      reason: 'purchase',
      idempotencyKey: 'idem-2',
      correlationId: validUuid
    });

    expect(credit.error).toBeUndefined();
    expect(debit.error).toBeUndefined();
  });

  it('rejects invalid wallet-service Joi payloads', () => {
    const result = WalletValidator.placeHold.validate({
      userId: 'not-uuid',
      amount: -1,
      currency: 'TZ',
      reason: '',
      expiresInSeconds: 0,
      idempotencyKey: '',
      correlationId: 'bad-id'
    });

    expect(result.error).toBeDefined();
  });

  it('validates payment-service zod wallet schemas', () => {
    expect(() =>
      paymentCreditWalletSchema.parse({
        params: { userId: validUuid },
        body: { amount: 25, description: 'credit' }
      })
    ).not.toThrow();

    expect(() =>
      paymentDebitWalletSchema.parse({
        params: { userId: validUuid },
        body: { amount: 10, description: 'debit' }
      })
    ).not.toThrow();

    expect(() =>
      paymentGetWalletSchema.parse({
        params: { userId: validUuid }
      })
    ).not.toThrow();
  });
});
