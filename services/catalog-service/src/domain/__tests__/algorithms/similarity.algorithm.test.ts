import { SimilarityAlgorithm } from '../../algorithms/similarity.algorithm';

describe('SimilarityAlgorithm', () => {
    describe('calculateLevenshteinDistance', () => {
        it('should return 0 for identical strings', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('hello', 'hello')).toBe(0);
        });

        it('should calculate distance for single character difference', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('hello', 'hallo')).toBe(1);
        });

        it('should calculate distance for insertion', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('cat', 'cats')).toBe(1);
        });

        it('should calculate distance for deletion', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('cats', 'cat')).toBe(1);
        });

        it('should calculate distance for completely different strings', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('abc', 'xyz')).toBe(3);
        });

        it('should handle empty strings', () => {
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('', 'hello')).toBe(5);
            expect(SimilarityAlgorithm.calculateLevenshteinDistance('hello', '')).toBe(5);
        });
    });

    describe('calculateJaccardSimilarity', () => {
        it('should return 1 for identical strings', () => {
            expect(SimilarityAlgorithm.calculateJaccardSimilarity('hello', 'hello')).toBe(1);
        });

        it('should return 0 for completely different strings', () => {
            const similarity = SimilarityAlgorithm.calculateJaccardSimilarity('abc', 'xyz');
            expect(similarity).toBe(0);
        });

        it('should calculate similarity for partially similar strings', () => {
            const similarity = SimilarityAlgorithm.calculateJaccardSimilarity('hello', 'hallo');
            expect(similarity).toBeGreaterThan(0);
            expect(similarity).toBeLessThan(1);
        });

        it('should handle empty strings', () => {
            expect(SimilarityAlgorithm.calculateJaccardSimilarity('', 'hello')).toBe(0);
            expect(SimilarityAlgorithm.calculateJaccardSimilarity('hello', '')).toBe(0);
        });
    });

    describe('calculateStringSimilarity', () => {
        it('should return 1 for identical strings', () => {
            expect(SimilarityAlgorithm.calculateStringSimilarity('hello', 'hello')).toBe(1);
        });

        it('should return 0 for empty strings', () => {
            expect(SimilarityAlgorithm.calculateStringSimilarity('', 'hello')).toBe(0);
            expect(SimilarityAlgorithm.calculateStringSimilarity('hello', '')).toBe(0);
        });

        it('should return high similarity for very similar strings', () => {
            const similarity = SimilarityAlgorithm.calculateStringSimilarity('iPhone 15', 'iPhone 14');
            expect(similarity).toBeGreaterThan(0.8);
        });

        it('should return low similarity for different strings', () => {
            const similarity = SimilarityAlgorithm.calculateStringSimilarity('iPhone', 'Samsung');
            expect(similarity).toBeLessThan(0.5);
        });

        it('should be case-sensitive', () => {
            const similarity = SimilarityAlgorithm.calculateStringSimilarity('HELLO', 'hello');
            expect(similarity).toBeLessThan(1);
        });
    });

    describe('areSimilar', () => {
        it('should return true for identical strings', () => {
            expect(SimilarityAlgorithm.areSimilar('hello', 'hello')).toBe(true);
        });

        it('should return true for very similar strings with default threshold', () => {
            expect(SimilarityAlgorithm.areSimilar('iPhone 15 Pro', 'iPhone 15 Pro Max')).toBe(true);
        });

        it('should return false for dissimilar strings', () => {
            expect(SimilarityAlgorithm.areSimilar('iPhone', 'Samsung')).toBe(false);
        });

        it('should respect custom threshold', () => {
            expect(SimilarityAlgorithm.areSimilar('hello', 'hallo', 0.9)).toBe(true);
            expect(SimilarityAlgorithm.areSimilar('hello', 'hallo', 0.99)).toBe(false);
        });
    });
});
