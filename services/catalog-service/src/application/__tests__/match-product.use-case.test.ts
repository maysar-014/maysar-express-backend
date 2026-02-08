import { MatchProductUseCase } from '../use-cases/match-product.use-case';
import { IProductRepository, IProductMatchAuditRepository } from '../../domain/repositories/repository.interfaces';
import { Product } from '../../domain/entities/product.entity';
import { ProductId, SellerId, CategoryId } from '../../domain/value-objects/ids.value-object';
import { ProductStatusValue, ProductStatus, ProductType, ProductVisibility } from '../../domain/value-objects/product-types.value-object';
import { ProductIdentifiers } from '../../domain/value-objects/product-identifiers.value-object';
import { MatchLevel } from '../../domain/value-objects/match-result.value-object';

// Mock repositories
class MockProductRepository implements IProductRepository {
    private products: Product[] = [];

    setProducts(products: Product[]) {
        this.products = products;
    }

    async findById(id: string): Promise<Product | null> {
        return this.products.find(p => p.getId().toString() === id) || null;
    }

    async findByIdentifiers(identifiers: any): Promise<Product[]> {
        return this.products.filter(p => {
            const pIds = p.getIdentifiers();
            return pIds && identifiers.equals(pIds);
        });
    }

    async findByFingerprint(fingerprint: string, categoryId: string): Promise<Product[]> {
        return this.products.filter(p => {
            const fp = p.getFingerprint();
            return fp && fp.value === fingerprint && fp.categoryId === categoryId;
        });
    }

    async findByCategoryAndBrand(categoryId: string, brand: string): Promise<Product[]> {
        return this.products.filter(p => {
            return p.getCategoryId()?.toString() === categoryId &&
                p.getBrand()?.toLowerCase() === brand.toLowerCase();
        });
    }

    async save(product: Product): Promise<void> {
        this.products.push(product);
    }
}

class MockAuditRepository implements IProductMatchAuditRepository {
    private audits: any[] = [];

    async save(audit: any): Promise<void> {
        this.audits.push(audit);
    }

    async findById(id: string): Promise<any | null> {
        return this.audits.find(a => a.id === id) || null;
    }

    async findBySeller(sellerId: string, limit?: number): Promise<any[]> {
        return this.audits.filter(a => a.sellerId === sellerId).slice(0, limit);
    }

    async findByMatchLevel(level: string): Promise<any[]> {
        return this.audits.filter(a => a.matchLevel === level);
    }

    getAudits() {
        return this.audits;
    }
}

// Helper to create mock variant
const createMockVariant = () => ({
    getId: () => 'var-1',
    getSku: () => 'SKU-001',
    getName: () => 'Default',
    getPrice: () => ({ amount: 100, currency: 'USD' } as any),
    getCompareAtPrice: () => undefined,
    getCostPrice: () => undefined,
    getInventoryQuantity: () => 10,
    getAttributes: () => ({}),
    isInStock: () => true,
    isOnSale: () => false,
    calculateMargin: () => null,
});

describe('MatchProductUseCase - Integration', () => {
    let useCase: MatchProductUseCase;
    let productRepo: MockProductRepository;
    let auditRepo: MockAuditRepository;

    beforeEach(() => {
        productRepo = new MockProductRepository();
        auditRepo = new MockAuditRepository();
        useCase = new MatchProductUseCase(productRepo, auditRepo);
    });

    it('should find exact match by identifier and create audit', async () => {
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

        productRepo.setProducts([existingProduct]);

        const result = await useCase.execute({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'cat-1',
            identifiers: { gtin: '123456' },
            sellerId: 'seller-2',
        });

        expect(result.matchFound).toBe(true);
        expect(result.confirmationRequired).toBe(false);
        expect(result.matchLevel).toBe(MatchLevel.EXACT);
        expect(auditRepo.getAudits()).toHaveLength(1);
        expect(auditRepo.getAudits()[0].decision).toBe('AUTO_MERGED');
    });

    it('should return no match when no products exist', async () => {
        productRepo.setProducts([]);

        const result = await useCase.execute({
            brand: 'Apple',
            model: 'iPhone 15',
            categoryId: 'cat-1',
            sellerId: 'seller-1',
        });

        expect(result.matchFound).toBe(false);
        expect(result.confirmationRequired).toBe(false);
        expect(result.matchLevel).toBe(MatchLevel.NO_MATCH);
        expect(auditRepo.getAudits()).toHaveLength(1);
        expect(auditRepo.getAudits()[0].decision).toBe('NEW_PRODUCT');
    });

    it('should require confirmation for possible match', async () => {
        const existingProduct = new Product(
            new ProductId('prod-2'),
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

        productRepo.setProducts([existingProduct]);

        const result = await useCase.execute({
            brand: 'Apple',
            model: 'iPhone 15 Pro',
            categoryId: 'cat-1',
            sellerId: 'seller-2',
        });

        expect(result.matchFound).toBe(false);
        expect(result.confirmationRequired).toBe(true);
        expect(result.matchLevel).toBe(MatchLevel.POSSIBLE);
        expect(result.candidates).toBeDefined();
        expect(result.candidates!.length).toBeGreaterThan(0);
    });
});
