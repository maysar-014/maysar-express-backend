import { MatchCriteriaBuilder } from './match-criteria.builder';

describe('MatchCriteriaBuilder', () => {
  it('builds criteria with identifier/fingerprint/brand/model exact matches', () => {
    const candidate = {
      identifiers: {
        gtin: '123',
        equals: jest.fn().mockReturnValue(true)
      },
      fingerprint: {
        matches: jest.fn().mockReturnValue(true)
      },
      brand: 'HP',
      model: 'LaserJet Pro'
    } as any;
    const existing = {
      getIdentifiers: () => ({ gtin: '123', mpn: undefined, isbn: undefined }),
      getFingerprint: () => ({}),
      getBrand: () => 'Hewlett Packard',
      getModel: () => 'laserjet pro'
    } as any;

    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);

    expect(criteria.identifierMatch).toBe(true);
    expect(criteria.fingerprintMatch).toBe(true);
    expect(criteria.brandMatch).toBe(true);
    expect(criteria.modelMatch).toBe(true);
    expect(criteria.matchedField).toBe('gtin');
  });

  it('sets similarityScore when model does not match exactly', () => {
    const candidate = {
      brand: 'LG Electronics',
      model: 'Model X 2026'
    } as any;
    const existing = {
      getIdentifiers: () => undefined,
      getFingerprint: () => undefined,
      getBrand: () => 'lg',
      getModel: () => 'Model Y 2026'
    } as any;

    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);

    expect(criteria.brandMatch).toBe(true);
    expect(criteria.modelMatch).toBeUndefined();
    expect(criteria.similarityScore).toBeDefined();
    expect(criteria.similarityScore).toBeGreaterThanOrEqual(0);
    expect(criteria.similarityScore).toBeLessThanOrEqual(1);
  });
});

