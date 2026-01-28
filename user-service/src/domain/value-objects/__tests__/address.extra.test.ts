import { Address } from '../../value-objects/address.value-object';

describe('Address Value Object - extra branches', () => {
  it('throws on invalid address data', () => {
    expect(() => Address.create({
      id: 'x', userId: 'u', type: 'home' as const, isPrimary: false,
      street: '', city: '', state: '', postalCode: '', country: '',
      coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date()
    })).toThrow();
  });

  it('createBusiness/home/billing/shipping helpers', () => {
    const data = { id: 'i', userId: 'u', isPrimary: false, street: 'S', city: 'C', state: '', postalCode: '000', country: 'TZ', coordinates: { latitude: 0, longitude: 0 }, createdAt: new Date(), updatedAt: new Date() };
    const b = Address.createBusiness(data);
    expect(b.getType()).toBe('business');
    const h = Address.createHome(data);
    expect(h.getType()).toBe('home');
    const bill = Address.createBilling(data);
    expect(bill.getType()).toBe('billing');
    const ship = Address.createShipping(data);
    expect(ship.getType()).toBe('shipping');
  });

  it('distance returns null when missing coordinates', () => {
    const a = Address.create({ id: 'a1', userId: 'u1', type: 'home' as const, isPrimary: true, street: 'S', city: 'C', state: '', postalCode: '000', country: 'Tanzania', coordinates: undefined as any, createdAt: new Date(), updatedAt: new Date() });
    const b = Address.create({ id: 'a2', userId: 'u2', type: 'home' as const, isPrimary: false, street: 'S', city: 'C', state: '', postalCode: '000', country: 'Tanzania', coordinates: undefined as any, createdAt: new Date(), updatedAt: new Date() });
    expect(a.getDistanceTo(b)).toBeNull();
  });
});
