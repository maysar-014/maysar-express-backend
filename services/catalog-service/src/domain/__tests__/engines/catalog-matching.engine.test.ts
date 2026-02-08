import { CatalogMatchingEngine, ProductCandidate } from '../../engines/catalog-matching.engine';
import { Product } from '../../entities/product.entity';
import { ProductIdentifiers } from '../../value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../../value-objects/product-fingerprint.value-object';
import { MatchLevel } from '../../value-objects/match-result.value-object';
import { ProductId, SellerId, CategoryId } from '../../value-objects/ids.value-object';
import { ProductStatusValue, ProductStatus, ProductType, ProductVisibility } from '../../value-objects/product-types.value-object';
import { Price } from '../../value-objects/monetary.value-object';

// Mock product variant for testing
const createMockVariant = () => ({
    getId: () => 'var-1',
    getSku: () => 'SKU-001',
    getName: () => 'Default Variant',
    getPrice: () => new Price(100, 'USD'),
    getCompareAtPrice: () => undefined,
    getCostPrice: () => undefined,
    getInventoryQuantity: () => 10,
    getAttributes: () => ({}),
    isInStock: () => true,
    isOnSale: () => false,
    calculateMargin: () => null,
});

describe('CatalogMatchingEngine', () => {
    describe('matchProduct - Exact Match', () => {
        it('should find exact match by GTIN', () => {
            const candidate: ProductCandidate = {
                identifiers: new ProductIdentifiers({ gtin: '123456' }),
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-1'),
                new SellerId('seller-1'),
                'iPhone 15',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Apple',
                'iPhone 15',
                [createMockVariant()],
                [],
                [],
                undefined,
                undefined,
                undefined,
                new ProductIdentifiers({ gtin: '123456' }),
                undefined
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.EXACT);
            expect(result.score).toBe(100);
            expect(result.matchedProductId).toBe('prod-1');
            expect(result.shouldAutoMerge()).toBe(true);
        });

        it('should find exact match by MPN', () => {
            const candidate: ProductCandidate = {
                identifiers: new ProductIdentifiers({ mpn: 'ABC123' }),
                brand: 'Samsung',
                model: 'Galaxy S24',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-2'),
                new SellerId('seller-1'),
                'Galaxy S24',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Samsung',
                'Galaxy S24',
                [createMockVariant()],
                [],
                [],
                undefined,
                undefined,
                undefined,
                new ProductIdentifiers({ mpn: 'ABC123' }),
                undefined
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.EXACT);
            expect(result.score).toBe(100);
        });
    });

    describe('matchProduct - Strong Match', () => {
        it('should find strong match by fingerprint', () => {
            const fingerprint = ProductFingerprint.generate({
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'cat-1',
            });

            const candidate: ProductCandidate = {
                fingerprint,
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-3'),
                new SellerId('seller-1'),
                'iPhone 15',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Apple',
                'iPhone 15',
                [createMockVariant()],
                [],
                [],
                undefined,
                undefined,
                undefined,
                undefined,
                fingerprint
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.STRONG);
            expect(result.score).toBe(95);
            expect(result.shouldAutoMerge()).toBe(true);
        });
    });

    describe('matchProduct - Possible Match', () => {
        it('should find possible match by similarity', () => {
            const candidate: ProductCandidate = {
                brand: 'Apple',
                model: 'iPhone 15 Pro',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-4'),
                new SellerId('seller-1'),
                'iPhone 15 Pro Max',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Apple',
                'iPhone 15 Pro Max',
                [createMockVariant()]
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.POSSIBLE);
            expect(result.score).toBeGreaterThan(85);
            expect(result.requiresConfirmation).toBe(true);
        });

        it('should not match if brand differs', () => {
            const candidate: ProductCandidate = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-5'),
                new SellerId('seller-1'),
                'Galaxy S24',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Samsung',
                'Galaxy S24',
                [createMockVariant()]
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.NO_MATCH);
        });
    });

    describe('matchProduct - No Match', () => {
        it('should return no match when no products exist', () => {
            const candidate: ProductCandidate = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'cat-1',
            };

            const result = CatalogMatchingEngine.matchProduct(candidate, []);

            expect(result.level).toBe(MatchLevel.NO_MATCH);
            expect(result.score).toBe(0);
            expect(result.shouldAutoMerge()).toBe(false);
        });

        it('should return no match when similarity is below threshold', () => {
            const candidate: ProductCandidate = {
                brand: 'Apple',
                model: 'iPhone',
                categoryId: 'cat-1',
            };

            const existingProduct = new Product(
                new ProductId('prod-6'),
                new SellerId('seller-1'),
                'MacBook Pro',
                'Description',
                new ProductStatusValue(ProductStatus.PUBLISHED),
                ProductType.PHYSICAL,
                ProductVisibility.PUBLIC,
                new CategoryId('cat-1'),
                'Apple',
                'MacBook Pro',
                [createMockVariant()]
            );

            const result = CatalogMatchingEngine.matchProduct(candidate, [existingProduct]);

            expect(result.level).toBe(MatchLevel.NO_MATCH);
        });
    });
});
