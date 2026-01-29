import { Address } from '../address.value-object';
import { PhoneNumber } from '../phone-number.value-object';

describe('Address Value Object - Comprehensive', () => {
  test('creates valid address', () => {
    const addr = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 Main St', city: 'Dar es Salaam', state: 'Dar', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.3 }, createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.isValid()).toBe(true);
  });

  test('throws on invalid street', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid city', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: '', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid postal code', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '', country: 'Tanzania',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid country', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: '',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid address type', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'invalid' as any, isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid latitude', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: 91, longitude: 39 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('throws on invalid longitude', () => {
    expect(() => Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6, longitude: 181 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  test('equals compares addresses', () => {
    const data = {
      id: '1', userId: 'u1', type: 'home' as const, isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6, longitude: 39 }, createdAt: new Date(), updatedAt: new Date()
    };
    const addr1 = Address.create(data);
    const addr2 = Address.create(data);
    expect(addr1.equals(addr2)).toBe(true);
  });

  test('toString formats address', () => {
    const addr = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: 'Dar', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6, longitude: 39 }, createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.toString()).toContain('123 St');
    expect(addr.toString()).toContain('Dar');
  });

  test('toFullString includes coordinates', () => {
    const addr = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.3 }, createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.toFullString()).toContain('Lat:');
    expect(addr.toFullString()).toContain('Lng:');
  });

  test('isTanzanian detects Tanzania', () => {
    const addr = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.isTanzanian()).toBe(true);
  });

  test('getDistanceTo calculates distance', () => {
    const addr1 = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.3 }, createdAt: new Date(), updatedAt: new Date()
    });
    const addr2 = Address.create({
      id: '2', userId: 'u1', type: 'home', isPrimary: false,
      street: '456 Ave', city: 'Arusha', state: '', postalCode: '54321', country: 'Tanzania',
      coordinates: { latitude: -3.4, longitude: 36.7 }, createdAt: new Date(), updatedAt: new Date()
    });
    const distance = addr1.getDistanceTo(addr2);
    expect(distance).toBeGreaterThan(0);
  });

  test('getDistanceTo returns null without coordinates', () => {
    const addr1 = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    const addr2 = Address.create({
      id: '2', userId: 'u1', type: 'home', isPrimary: false,
      street: '456 Ave', city: 'Arusha', state: '', postalCode: '54321', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr1.getDistanceTo(addr2)).toBeNull();
  });

  test('createBusiness creates business address', () => {
    const addr = Address.createBusiness({
      id: '1', userId: 'u1', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.getType()).toBe('business');
  });

  test('createHome creates home address', () => {
    const addr = Address.createHome({
      id: '1', userId: 'u1', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.getType()).toBe('home');
  });

  test('createBilling creates billing address', () => {
    const addr = Address.createBilling({
      id: '1', userId: 'u1', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.getType()).toBe('billing');
  });

  test('createShipping creates shipping address', () => {
    const addr = Address.createShipping({
      id: '1', userId: 'u1', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.getType()).toBe('shipping');
  });

  test('fromString parses address', () => {
    const addr = Address.fromString('123 St, Dar, Tanzania');
    expect(addr.isValid()).toBe(true);
  });

  test('isPrimary returns primary status', () => {
    const addr = Address.create({
      id: '1', userId: 'u1', type: 'home', isPrimary: true,
      street: '123 St', city: 'Dar', state: '', postalCode: '12345', country: 'Tanzania',
      createdAt: new Date(), updatedAt: new Date()
    });
    expect(addr.isPrimary()).toBe(true);
  });
});

describe('PhoneNumber Value Object - Comprehensive', () => {
  test('creates valid phone number', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.isValid()).toBe(true);
  });

  test('normalizes phone number', () => {
    const phone = PhoneNumber.create('255712345678');
    expect(phone.value).toBe('+255712345678');
  });

  test('throws on invalid format', () => {
    expect(() => PhoneNumber.create('+1234')).toThrow();
  });

  test('equals compares phone numbers', () => {
    const phone1 = PhoneNumber.create('+255712345678');
    const phone2 = PhoneNumber.create('+255712345678');
    expect(phone1.equals(phone2)).toBe(true);
  });

  test('toString returns value', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.toString()).toBe('+255712345678');
  });

  test('formatForDisplay formats phone', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.formatForDisplay()).toContain('+255');
  });

  test('isTanzanian detects Tanzania', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.isTanzanian()).toBe(true);
  });

  test('getType detects mobile', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.getType()).toBe('mobile');
  });

  test('getType detects landline', () => {
    const phone = PhoneNumber.create('+255222345678');
    expect(phone.getType()).toBe('landline');
  });

  test('fromParts creates phone', () => {
    const phone = PhoneNumber.fromParts('+255', '712345678');
    expect(phone.isTanzanian()).toBe(true);
  });

  test('isValid static method validates', () => {
    expect(PhoneNumber.isValid('+255712345678')).toBe(true);
    expect(PhoneNumber.isValid('+1234')).toBe(false);
  });

  test('extractCountryCode extracts code', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.countryCode).toBe('+255');
  });

  test('extractNationalNumber extracts number', () => {
    const phone = PhoneNumber.create('+255712345678');
    expect(phone.nationalNumber).toBe('712345678');
  });
});
