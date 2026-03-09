import { RecipientType } from './recipient-types.value-object';

describe('RecipientType enum', () => {
  it('exposes expected recipient values', () => {
    expect(RecipientType.COURIER).toBe('courier');
    expect(RecipientType.SELLER).toBe('seller');
    expect(RecipientType.ENABLER).toBe('enabler');
    expect(RecipientType.CUSTOMER).toBe('customer');
  });
});
