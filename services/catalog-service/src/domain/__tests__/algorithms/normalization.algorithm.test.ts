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

    describe('normalizeStorage', () => {
        it('should normalise "256 GB" to "256GB"', () => {
            expect(NormalizationAlgorithm.normalizeStorage('256 GB')).toBe('256GB');
        });

        it('should normalise "256gb" to "256GB"', () => {
            expect(NormalizationAlgorithm.normalizeStorage('256gb')).toBe('256GB');
        });

        it('should normalise "1 TB" to "1TB"', () => {
            expect(NormalizationAlgorithm.normalizeStorage('1 TB')).toBe('1TB');
        });

        it('should normalise "512 MB" to "512MB"', () => {
            expect(NormalizationAlgorithm.normalizeStorage('512 MB')).toBe('512MB');
        });
    });

    describe('normalizeWeight', () => {
        it('should normalise "1.5 Kg" to "1.5kg"', () => {
            expect(NormalizationAlgorithm.normalizeWeight('1.5 Kg')).toBe('1.5kg');
        });

        it('should normalise "500 g" to "500g"', () => {
            expect(NormalizationAlgorithm.normalizeWeight('500 g')).toBe('500g');
        });

        it('should normalise "2 kgs" to "2kg"', () => {
            expect(NormalizationAlgorithm.normalizeWeight('2 kgs')).toBe('2kg');
        });
    });

    describe('normalizeDuration', () => {
        it('should normalise "2 yrs" to "2 years"', () => {
            expect(NormalizationAlgorithm.normalizeDuration('2 yrs')).toBe('2 years');
        });

        it('should normalise "Two years" to "2 years"', () => {
            expect(NormalizationAlgorithm.normalizeDuration('Two years')).toBe('2 years');
        });

        it('should normalise "12 months" unchanged', () => {
            expect(NormalizationAlgorithm.normalizeDuration('12 months')).toBe('12 months');
        });

        it('should normalise "1 yr" to "1 years"', () => {
            expect(NormalizationAlgorithm.normalizeDuration('1 yr')).toBe('1 years');
        });
    });

    describe('normalizeDisplaySize', () => {
        it('should normalise "6.6 Inch" to "6.6 inch"', () => {
            expect(NormalizationAlgorithm.normalizeDisplaySize('6.6 Inch')).toBe('6.6 inch');
        });

        it('should convert 6.6" to "6.6 inch"', () => {
            expect(NormalizationAlgorithm.normalizeDisplaySize('6.6"')).toBe('6.6 inch');
        });

        it('should normalise "6.6 inches" to "6.6 inch"', () => {
            expect(NormalizationAlgorithm.normalizeDisplaySize('6.6 inches')).toBe('6.6 inch');
        });
    });

    describe('normalizeByAttributeKey', () => {
        it('should apply storage normalisation for "storage" key', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('storage', '256 GB')).toBe('256GB');
        });

        it('should apply storage normalisation for "internal_memory" key', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('internal_memory', '256gb')).toBe('256GB');
        });

        it('should apply weight normalisation for "weight" key', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('weight', '2 kgs')).toBe('2kg');
        });

        it('should apply duration normalisation for "warranty" key', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('warranty', '2 yrs')).toBe('2 years');
        });

        it('should apply display normalisation for "display" key', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('display', '6.6"')).toBe('6.6 inch');
        });

        it('should fall back to generic normalisation for unknown keys', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('custom_attr', '  Hello World  ')).toBe('Hello World');
        });

        it('should return empty string for empty value', () => {
            expect(NormalizationAlgorithm.normalizeByAttributeKey('storage', '')).toBe('');
        });
    });
});

