import { SellerLocation } from '../seller-location.entity';
import { ProductLocation } from '../product-location.entity';

const base = {
  id: 'sloc_1',
  sellerId: 'seller_1',
  name: 'Kariakoo Shop',
  type: 'SHOP' as const,
  status: 'ACTIVE' as const,
  address: { street: 'Kariakoo Market', region: 'Dar es Salaam', country: 'Tanzania' },
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
      .toThrow('Street is required');
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

describe('ProductLocation', () => {
  const pl = new ProductLocation({
    id: 'ploc_1',
    productId: 'prod_1',
    locationId: 'sloc_1',
    sellerId: 'seller_1',
    quantityAvailable: 10,
    quantityReserved: 3,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('netAvailable = available - reserved', () => {
    expect(pl.netAvailable).toBe(7);
  });

  it('reserve reduces netAvailable', () => {
    const copy = new ProductLocation({ ...pl, quantityAvailable: 10, quantityReserved: 0, id: 'x', createdAt: new Date(), updatedAt: new Date() });
    copy.reserve(4);
    expect(copy.netAvailable).toBe(6);
  });

  it('reserve throws when insufficient stock', () => {
    expect(() => pl.reserve(100)).toThrow('Insufficient stock');
  });

  it('adjustStock increments available', () => {
    const copy = new ProductLocation({ ...pl, quantityAvailable: 5, quantityReserved: 0, id: 'y', createdAt: new Date(), updatedAt: new Date() });
    copy.adjustStock(5);
    expect(copy.quantityAvailable).toBe(10);
  });

  it('adjustStock throws on negative result', () => {
    expect(() => pl.adjustStock(-100)).toThrow('negative');
  });

  it('throws on negative quantityAvailable at construction', () => {
    expect(() => new ProductLocation({
      id: 'z', productId: 'p', locationId: 'l', sellerId: 's',
      quantityAvailable: -1, quantityReserved: 0, isAvailable: false,
      createdAt: new Date(), updatedAt: new Date(),
    })).toThrow('cannot be negative');
  });
});
