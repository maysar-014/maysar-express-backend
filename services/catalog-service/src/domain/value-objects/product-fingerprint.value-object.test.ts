import { ProductFingerprint } from './product-fingerprint.value-object';

describe('ProductFingerprint', () => {
  it('generates deterministic fingerprint with expected metadata', () => {
    const input = {
      brand: 'HP',
      model: 'Pavilion 15',
      categoryId: 'laptops',
      attributes: { ram: '16GB', storage: '512 SSD' }
    };

    const a = ProductFingerprint.generate(input);
    const b = ProductFingerprint.generate(input);

    expect(a.value).toHaveLength(64);
    expect(a.version).toBe(1);
    expect(a.categoryId).toBe('laptops');
    expect(a.value).toBe(b.value);
    expect(a.toString()).toBe(a.value);
  });

  it('matches only when version, category and value are equal', () => {
    const one = ProductFingerprint.generate({
      brand: 'BrandA',
      model: 'Model1',
      categoryId: 'phones'
    });
    const same = new ProductFingerprint(one.value, 1, 'phones');
    const differentCategory = new ProductFingerprint(one.value, 1, 'laptops');
    const differentValue = ProductFingerprint.generate({
      brand: 'BrandB',
      model: 'Model2',
      categoryId: 'phones'
    });

    expect(one.matches(same)).toBe(true);
    expect(one.matches(differentCategory)).toBe(false);
    expect(one.matches(differentValue)).toBe(false);
  });
});
