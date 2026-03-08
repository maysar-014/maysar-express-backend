import { TotpToken } from './totp-token.value-object';

describe('TotpToken', () => {
  it('normalizes valid tokens and validates format', () => {
    const token = TotpToken.fromString(' 123 456 ');

    expect(token.getValue()).toBe('123456');
    expect(token.validate()).toBe(true);
  });

  it('throws for invalid token formats', () => {
    expect(() => TotpToken.fromString('ABC123')).toThrow(
      'Invalid TOTP token format. Must be exactly 6 digits.'
    );
    expect(() => TotpToken.fromString('12345')).toThrow(
      'Invalid TOTP token format. Must be exactly 6 digits.'
    );
  });
});
