import { ProductIdentifiers } from '../../value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../../value-objects/product-fingerprint.value-object';
import { MatchResult, MatchLevel } from '../../value-objects/match-result.value-object';

describe('ProductIdentifiers', () => {
    it('should create with normalized identifiers', () => {
        const ids = new ProductIdentifiers({
            gtin: '123456',
            mpn: 'abc-123',
            isbn: '978-0-123456-78-9',
        });

        expect(ids.gtin).toBe('00000000123456');
        expect(ids.mpn).toBe('ABC123');
        expect(ids.isbn).toBe('9780123456789');
    });

    it('should handle undefined identifiers', () => {
        const ids = new ProductIdentifiers({});
        expect(ids.gtin).toBeUndefined();
        expect(ids.mpn).toBeUndefined();
        expect(ids.isbn).toBeUndefined();
    });

    it('should detect if any identifier exists', () => {
        const ids1 = new ProductIdentifiers({ gtin: '123456' });
        const ids2 = new ProductIdentifiers({});

        expect(ids1.hasAnyIdentifier()).toBe(true);
        expect(ids2.hasAnyIdentifier()).toBe(false);
    });

    it('should compare identifiers correctly', () => {
        const ids1 = new ProductIdentifiers({ gtin: '123456' });
        const ids2 = new ProductIdentifiers({ gtin: '123456' });
        const ids3 = new ProductIdentifiers({ gtin: '654321' });

        expect(ids1.equals(ids2)).toBe(true);
        expect(ids1.equals(ids3)).toBe(false);
    });

    it('should match on any identifier', () => {
        const ids1 = new ProductIdentifiers({ gtin: '123', mpn: 'ABC' });
        const ids2 = new ProductIdentifiers({ mpn: 'ABC', isbn: '456' });

        expect(ids1.equals(ids2)).toBe(true);
    });
});

describe('ProductFingerprint', () => {
    it('should generate fingerprint from input', () => {
        const fp = ProductFingerprint.generate({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'electronics',
        });

        expect(fp.value).toHaveLength(64);
        expect(fp.version).toBe(1);
        expect(fp.categoryId).toBe('electronics');
    });

    it('should match identical fingerprints', () => {
        const fp1 = ProductFingerprint.generate({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'electronics',
        });

        const fp2 = ProductFingerprint.generate({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'electronics',
        });

        expect(fp1.matches(fp2)).toBe(true);
    });

    it('should not match different fingerprints', () => {
        const fp1 = ProductFingerprint.generate({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'electronics',
        });

        const fp2 = ProductFingerprint.generate({
            brand: 'Samsung',
            model: 'Galaxy S24',
            categoryId: 'electronics',
        });

        expect(fp1.matches(fp2)).toBe(false);
    });

    it('should not match fingerprints from different categories', () => {
        const fp1 = new ProductFingerprint('abc123', 1, 'electronics');
        const fp2 = new ProductFingerprint('abc123', 1, 'phones');

        expect(fp1.matches(fp2)).toBe(false);
    });
});

describe('MatchResult', () => {
    it('should identify exact match', () => {
        const result = new MatchResult({
            level: MatchLevel.EXACT,
            score: 100,
            matchedProductId: 'prod-123',
            criteria: { identifierMatch: true },
            requiresConfirmation: false,
        });

        expect(result.isExactMatch()).toBe(true);
        expect(result.isStrongMatch()).toBe(false);
        expect(result.shouldAutoMerge()).toBe(true);
    });

    it('should identify strong match', () => {
        const result = new MatchResult({
            level: MatchLevel.STRONG,
            score: 95,
            matchedProductId: 'prod-123',
            criteria: { fingerprintMatch: true },
            requiresConfirmation: false,
        });

        expect(result.isStrongMatch()).toBe(true);
        expect(result.shouldAutoMerge()).toBe(true);
    });

    it('should identify possible match requiring confirmation', () => {
        const result = new MatchResult({
            level: MatchLevel.POSSIBLE,
            score: 87,
            matchedProductId: 'prod-123',
            criteria: { similarityScore: 0.87 },
            requiresConfirmation: true,
        });

        expect(result.isPossibleMatch()).toBe(true);
        expect(result.shouldAutoMerge()).toBe(false);
    });

    it('should identify no match', () => {
        const result = MatchResult.noMatch();

        expect(result.isNoMatch()).toBe(true);
        expect(result.shouldAutoMerge()).toBe(false);
        expect(result.score).toBe(0);
    });
});
