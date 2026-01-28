import { Address } from '../../value-objects/address.value-object';

describe('Address Value Object', () => {
  it('creates and stringifies address', () => {
    const data = {
      id: 'a1',
      userId: 'u1',
      type: 'home' as const,
      isPrimary: true,
      street: '123 Main St',
      city: 'Dar es Salaam',
      state: 'Dar es Salaam',
      postalCode: '11111',
      country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.28 },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const addr = Address.create(data);
    expect(addr.isValid()).toBe(true);
    expect(addr.isTanzanian()).toBe(true);
    expect(addr.toString()).toContain('Dar es Salaam');
    expect(addr.toFullString()).toContain('Lat:');
  });

  it('calculates distance between two coordinates', () => {
    const a = Address.create({
      id: 'a1', userId: 'u1', type: 'home' as const, isPrimary: true,
      street: 'S1', city: 'C1', state: 'S', postalCode: '0000', country: 'Tanzania',
      coordinates: { latitude: -6.8, longitude: 39.28 }, createdAt: new Date(), updatedAt: new Date()
    });

    const b = Address.create({
      id: 'a2', userId: 'u2', type: 'home' as const, isPrimary: false,
      street: 'S2', city: 'C2', state: 'S', postalCode: '0000', country: 'Tanzania',
      coordinates: { latitude: -6.9, longitude: 39.3 }, createdAt: new Date(), updatedAt: new Date()
    });

    const dist = a.getDistanceTo(b);
    expect(typeof dist).toBe('number');
    expect(dist).toBeGreaterThan(0);
  });

  it('parses from string', () => {
    const parsed = Address.fromString('123 Main St, Dar es Salaam, Tanzania');
    expect(parsed.toString()).toContain('Dar es Salaam');
    expect(parsed.getType()).toBe('shipping');
  });
});