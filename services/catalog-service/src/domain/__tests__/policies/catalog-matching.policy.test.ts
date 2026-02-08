import { CatalogMatchingPolicy } from '../../policies/catalog-matching.policy';
import { MatchResult, MatchLevel } from '../../value-objects/match-result.value-object';

describe('CatalogMatchingPolicy', () => {
    describe('canAutoMerge', () => {
        it('should allow auto-merge for EXACT match', () => {
            const result = new MatchResult({
                level: MatchLevel.EXACT,
                score: 100,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: false,
            });

            expect(CatalogMatchingPolicy.canAutoMerge(result)).toBe(true);
        });

        it('should allow auto-merge for STRONG match', () => {
            const result = new MatchResult({
                level: MatchLevel.STRONG,
                score: 95,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: false,
            });

            expect(CatalogMatchingPolicy.canAutoMerge(result)).toBe(true);
        });

        it('should not allow auto-merge for POSSIBLE match', () => {
            const result = new MatchResult({
                level: MatchLevel.POSSIBLE,
                score: 87,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: true,
            });

            expect(CatalogMatchingPolicy.canAutoMerge(result)).toBe(false);
        });

        it('should not allow auto-merge for NO_MATCH', () => {
            const result = MatchResult.noMatch();
            expect(CatalogMatchingPolicy.canAutoMerge(result)).toBe(false);
        });
    });

    describe('requiresSellerConfirmation', () => {
        it('should require confirmation for POSSIBLE match', () => {
            const result = new MatchResult({
                level: MatchLevel.POSSIBLE,
                score: 87,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: true,
            });

            expect(CatalogMatchingPolicy.requiresSellerConfirmation(result)).toBe(true);
        });

        it('should not require confirmation for EXACT match', () => {
            const result = new MatchResult({
                level: MatchLevel.EXACT,
                score: 100,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: false,
            });

            expect(CatalogMatchingPolicy.requiresSellerConfirmation(result)).toBe(false);
        });
    });

    describe('shouldCreateNewProduct', () => {
        it('should create new product for NO_MATCH', () => {
            const result = MatchResult.noMatch();
            expect(CatalogMatchingPolicy.shouldCreateNewProduct(result)).toBe(true);
        });

        it('should not create new product for EXACT match', () => {
            const result = new MatchResult({
                level: MatchLevel.EXACT,
                score: 100,
                matchedProductId: 'prod-1',
                criteria: {},
                requiresConfirmation: false,
            });

            expect(CatalogMatchingPolicy.shouldCreateNewProduct(result)).toBe(false);
        });
    });

    describe('configuration', () => {
        it('should return confirmation timeout', () => {
            expect(CatalogMatchingPolicy.getConfirmationTimeout()).toBe(24);
        });

        it('should return max candidates limit', () => {
            expect(CatalogMatchingPolicy.getMaxCandidatesForConfirmation()).toBe(5);
        });
    });
});
