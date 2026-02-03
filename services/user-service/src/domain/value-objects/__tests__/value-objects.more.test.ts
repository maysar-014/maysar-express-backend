import { Address } from '../../value-objects/address.value-object';
import { PhoneNumber } from '../../value-objects/phone-number.value-object';
import { Email } from '../../value-objects/email.value-object';

describe('Additional Value Object branches', () => {
  it('address throws for invalid coordinates and invalid fromString', () => {
    expect(() => Address.create({
      id: 'x', userId: 'u', type: 'home' as const, isPrimary: false,
      street: 'S', city: 'C', state: '', postalCode: 'P', country: 'Tanzania',
      coordinates: { latitude: -100, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow(/Invalid address/);

    expect(() => Address.fromString('too short')).toThrow(/Address string/);
  });

  it('address.equals returns false for non-Address instances', () => {
    const a = Address.create({ id: 'a1', userId: 'u1', type: 'home' as const, isPrimary: true, street: 'S', city: 'C', state: '', postalCode: 'P', country: 'Tanzania', coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date() });
    // @ts-ignore - simulate a different object
    expect(a.equals({ value: a.value })).toBe(false);
  });

  it('phone number landline detection and equality', () => {
    const land = PhoneNumber.create('+255212345678');
    expect(land.getType()).toBe('landline');

    const p1 = PhoneNumber.create('+255712345678');
    const p2 = PhoneNumber.create('+255712345678');
    expect(p1.equals(p2)).toBe(true);
    const p3 = PhoneNumber.create('+255712345679');
    expect(p1.equals(p3)).toBe(false);
  });

  it('email domain behavior with subdomains and case', () => {
    const e = Email.create('user@mail.MaYsAr.Co.Tz');
    expect(e.getDomain()).toBe('mail.maysar.co.tz');
    // subdomains are not considered trusted by the current implementation
    expect(e.isTrustedDomain()).toBe(false);
  });
});
