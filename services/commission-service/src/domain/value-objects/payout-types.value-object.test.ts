import { PayoutMethod, PayoutStatus } from './payout-types.value-object';

describe('Payout enums', () => {
  it('exposes expected payout status and method values', () => {
    expect(PayoutStatus.PENDING).toBe('pending');
    expect(PayoutStatus.PROCESSED).toBe('processed');
    expect(PayoutMethod.BANK_TRANSFER).toBe('bank_transfer');
    expect(PayoutMethod.MOBILE_MONEY).toBe('mobile_money');
  });
});
