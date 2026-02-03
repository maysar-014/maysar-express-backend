import { Email } from '../../value-objects/email.value-object';

describe('Email Value Object - extra branches', () => {
  it('handles invalid inputs and equality negatives', () => {
    expect(Email.isValid('')).toBe(false);
    expect(Email.isValid(null as unknown as string)).toBe(false);

    const e1 = Email.create('User@Example.com');
    const e2 = Email.create('user@example.com');
    expect(e1.equals(e2)).toBe(true);

    const e3 = Email.create('someone@other.com');
    expect(e1.equals(e3)).toBe(false);
    expect(e3.isTrustedDomain()).toBe(false);
    expect(e3.isFromDomain('OTHER.com')).toBe(true); // case-insensitive
  });

  it('isSystemEmail negative cases', () => {
    const normal = Email.create('hello@notmaysar.com');
    expect(normal.isSystemEmail()).toBe(false);
  });
});
