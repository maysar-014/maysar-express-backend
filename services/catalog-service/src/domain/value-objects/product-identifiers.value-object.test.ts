import { ProductIdentifiers } from './product-identifiers.value-object';

describe('ProductIdentifiers', () => {
  it('normalizes identifiers and reports availability', () => {
    const ids = new ProductIdentifiers({
      gtin: '123456789012',
      mpn: 'ab-12 c',
      isbn: '978-1-4028-9462-6'
    });

    expect(ids.gtin).toBe('00123456789012');
    expect(ids.mpn).toBe('AB12C');
    expect(ids.isbn).toBe('9781402894626');
    expect(ids.hasAnyIdentifier()).toBe(true);
    expect(ids.toString()).toContain('GTIN:00123456789012');
  });

  it('matches when any normalized identifier overlaps', () => {
    const a = new ProductIdentifiers({ gtin: '123456789012', mpn: 'mpn-1' });
    const b = new ProductIdentifiers({ gtin: '00123456789012' });
    const c = new ProductIdentifiers({ mpn: 'MPN-1' });
    const d = new ProductIdentifiers({ isbn: '1111111111' });

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(true);
    expect(a.equals(d)).toBe(false);
  });

  it('supports empty identifier set', () => {
    const ids = new ProductIdentifiers({});
    expect(ids.hasAnyIdentifier()).toBe(false);
    expect(ids.toString()).toBe('');
  });
});
