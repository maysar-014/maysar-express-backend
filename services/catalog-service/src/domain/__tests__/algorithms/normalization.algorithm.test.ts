import { NormalizationAlgorithm } from '../../algorithms/normalization.algorithm';

describe('NormalizationAlgorithm', () => {
    describe('normalizeText', () => {
        it('should lowercase text', () => {
            expect(NormalizationAlgorithm.normalizeText('HELLO WORLD')).toBe('hello world');
        });

        it('should trim whitespace', () => {
            expect(NormalizationAlgorithm.normalizeText('  hello  ')).toBe('hello');
        });

        it('should remove special symbols', () => {
            expect(NormalizationAlgorithm.normalizeText('hello@world!')).toBe('helloworld');
        });

        it('should collapse multiple spaces', () => {
            expect(NormalizationAlgorithm.normalizeText('hello    world')).toBe('hello world');
        });

        it('should handle empty string', () => {
            expect(NormalizationAlgorithm.normalizeText('')).toBe('');
        });
    });

    describe('normalizeIdentifier', () => {
        it('should normalize GTIN by padding zeros', () => {
            expect(NormalizationAlgorithm.normalizeIdentifier('123456', 'GTIN')).toBe('00000000123456');
        });

        it('should remove dashes from GTIN', () => {
            expect(NormalizationAlgorithm.normalizeIdentifier('12-34-56-78-90-12-34', 'GTIN')).toBe('12345678901234');
        });

        it('should normalize MPN to uppercase', () => {
            expect(NormalizationAlgorithm.normalizeIdentifier('abc-123', 'MPN')).toBe('ABC123');
        });

        it('should normalize ISBN by removing dashes', () => {
            expect(NormalizationAlgorithm.normalizeIdentifier('978-0-123456-78-9', 'ISBN')).toBe('9780123456789');
        });

        it('should handle empty identifier', () => {
            expect(NormalizationAlgorithm.normalizeIdentifier('', 'GTIN')).toBe('');
        });
    });

    describe('normalizeBrand', () => {
        it('should normalize brand to lowercase', () => {
            expect(NormalizationAlgorithm.normalizeBrand('Samsung')).toBe('samsung');
        });

        it('should apply canonical mappings', () => {
            expect(NormalizationAlgorithm.normalizeBrand('Hewlett Packard')).toBe('hp');
            expect(NormalizationAlgorithm.normalizeBrand('HP')).toBe('hp');
        });

        it('should handle unmapped brands', () => {
            expect(NormalizationAlgorithm.normalizeBrand('Apple')).toBe('apple');
        });
    });

    describe('normalizeModel', () => {
        it('should normalize model text', () => {
            expect(NormalizationAlgorithm.normalizeModel('iPhone 15 Pro')).toBe('iphone 15 pro');
        });

        it('should remove special characters', () => {
            expect(NormalizationAlgorithm.normalizeModel('Model-X@2024')).toBe('modelx2024');
        });
    });

    describe('normalizeCategory', () => {
        it('should trim category ID', () => {
            expect(NormalizationAlgorithm.normalizeCategory('  cat-123  ')).toBe('cat-123');
        });

        it('should handle empty category', () => {
            expect(NormalizationAlgorithm.normalizeCategory('')).toBe('');
        });
    });
});
