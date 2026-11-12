import { SellerLocation } from '../seller-location.entity';

const base = {
  id: 'sloc_1',
  sellerId: 'seller_1',
  name: 'Kariakoo Shop',
  type: 'SHOP' as const,
  status: 'ACTIVE' as const,
  address: { street: 'Kariakoo Market', region: 'Dar es Salaam', country: 'Tanzania' },
  fulfillmentCapabilities: [],
  latitude: -6.8167,
  longitude: 39.2833,
  isPrimary: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SellerLocation', () => {
  it('creates a valid location', () => {
    const loc = new SellerLocation(base);
    expect(loc.id).toBe('sloc_1');
    expect(loc.latitude).toBe(-6.8167);
    expect(loc.displayAddress).toContain('Kariakoo Market');
  });

  it('throws on invalid latitude', () => {
    expect(() => new SellerLocation({ ...base, latitude: -91 })).toThrow('Invalid latitude');
  });

  it('throws on invalid longitude', () => {
    expect(() => new SellerLocation({ ...base, longitude: 181 })).toThrow('Invalid longitude');
  });

  it('throws on missing street', () => {
    expect(() => new SellerLocation({ ...base, address: { ...base.address, street: '' } }))
      .toThrow('Street, locality, or directions is required');
  });

  it('deactivate sets status to INACTIVE', () => {
    const loc = new SellerLocation(base);
    loc.deactivate();
    expect(loc.status).toBe('INACTIVE');
    expect(loc.isActive).toBe(false);
  });

  it('activate sets status to ACTIVE', () => {
    const loc = new SellerLocation({ ...base, status: 'INACTIVE', isActive: false });
    loc.activate();
    expect(loc.status).toBe('ACTIVE');
    expect(loc.isActive).toBe(true);
  });

  it('displayAddress includes ward and district when present', () => {
    const loc = new SellerLocation({
      ...base,
      address: {
        street: 'Sea View',
        ward: 'Kivukoni',
        district: 'Ilala Cbd',
        region: 'Dar es Salaam',
        country: 'Tanzania',
      },
    });
    expect(loc.displayAddress).toBe('Sea View, Kivukoni, Ilala Cbd, Dar es Salaam, Tanzania');
  });
});
