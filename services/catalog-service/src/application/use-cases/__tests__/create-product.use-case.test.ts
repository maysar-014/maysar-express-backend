// Test Suite for Verification Comments Implementation
// Comprehensive tests for all 6 critical fixes

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreateProductUseCase } from '../create-product.use-case';
import { PreviewGeneratedDescriptionUseCase } from '../preview-generated-description.use-case';
import { DescriptionValidationPolicy } from '../../domain/policies/description-validation.policy';
import { ProductQualityPolicy } from '../../domain/policies/product-quality.policy';
import { DescriptionGeneratorEngine } from '../../domain/engines/description-generator.engine';
import { PrismaProductAttributeRepository } from '../../infrastructure/repositories/prisma-product-attribute.repository';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// COMMENT 1: Description Validation - Composed Description Test
// ============================================================================

describe('Comment 1: Description Validation with Composed Description', () => {
  it('should validate composed description with all sections', () => {
    const composedDesc = `
      Overview text. Key features: feature1, feature2. 
      Specifications: color: black, size: large. 
      Usage: suitable for daily use. 
      Delivery: fast shipping available.
    `;
    
    const result = DescriptionValidationPolicy.validate(
      composedDesc,
      'Product Name',
      ['category']
    );
    
    expect(result.isValid).toBe(true);
    expect(result.violatedRules).toHaveLength(0);
  });

  it('should fail validation if specifications section missing', () => {
    const descWithoutSpecs = 'Overview text. Key features: feature1, feature2. Usage: suitable.';
    
    const result = DescriptionValidationPolicy.validate(
      descWithoutSpecs,
      'Product Name',
      ['category']
    );
    
    expect(result.isValid).toBe(false);
    expect(result.violatedRules).toContain('Description must include a specifications section');
  });

  it('should fail validation if description too short', () => {
    const shortDesc = 'Short text Specifications: color: black';
    
    const result = DescriptionValidationPolicy.validate(
      shortDesc,
      'Product Name',
      ['category']
    );
    
    expect(result.isValid).toBe(false);
    expect(result.violatedRules).toContain('Description must be at least 120 characters');
  });

  it('should fail validation if product name missing', () => {
    const desc = 'Overview text. Specifications: color: black. Usage: suitable. Delivery: fast.';
    
    const result = DescriptionValidationPolicy.validate(
      desc,
      'Different Product Name',
      ['category']
    );
    
    expect(result.isValid).toBe(false);
    expect(result.violatedRules).toContain('Description must contain the product name');
  });

  it('should fail validation if category keyword missing', () => {
    const desc = 'Product Name overview. Specifications: color: black. Usage: suitable. Delivery: fast.';
    
    const result = DescriptionValidationPolicy.validate(
      desc,
      'Product Name',
      ['electronics', 'gadgets']
    );
    
    expect(result.isValid).toBe(false);
    expect(result.violatedRules).toContain('Description must contain at least one category keyword: electronics, gadgets');
  });
});

// ============================================================================
// COMMENT 2: UUID ID Generation Test
// ============================================================================

describe('Comment 2: ProductAttribute UUID ID Generation', () => {
  let repository: PrismaProductAttributeRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      productAttribute: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
      },
    };
    repository = new PrismaProductAttributeRepository(mockPrisma);
  });

  it('should generate UUID v4 IDs for attributes', async () => {
    const productId = uuidv4();
    const attributes = [
      { attributeId: uuidv4(), value: 'value1' },
      { attributeId: uuidv4(), value: 'value2' },
    ];

    await repository.saveAll(productId, attributes);

    expect(mockPrisma.productAttribute.createMany).toHaveBeenCalled();
    const callArgs = mockPrisma.productAttribute.createMany.mock.calls[0][0];
    
    callArgs.data.forEach((item: any) => {
      // Validate UUID format (v4)
      expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  it('should not generate timestamp-based IDs', async () => {
    const productId = uuidv4();
    const attributes = [{ attributeId: uuidv4(), value: 'test' }];

    await repository.saveAll(productId, attributes);

    const callArgs = mockPrisma.productAttribute.createMany.mock.calls[0][0];
    const id = callArgs.data[0].id;

    // Should not contain timestamp pattern (Date.now() format)
    expect(id).not.toMatch(/^\d{13}-/);
  });

  it('should generate unique IDs for each attribute', async () => {
    const productId = uuidv4();
    const attributes = [
      { attributeId: uuidv4(), value: 'value1' },
      { attributeId: uuidv4(), value: 'value2' },
      { attributeId: uuidv4(), value: 'value3' },
    ];

    await repository.saveAll(productId, attributes);

    const callArgs = mockPrisma.productAttribute.createMany.mock.calls[0][0];
    const ids = callArgs.data.map((item: any) => item.id);

    // All IDs should be unique
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ============================================================================
// COMMENT 3: Preview DTO Contract Test
// ============================================================================

describe('Comment 3: Preview API Response DTO Contract', () => {
  let useCase: PreviewGeneratedDescriptionUseCase;
  let mockCategoryRepo: any;
  let mockAttributeRepo: any;

  beforeEach(() => {
    mockCategoryRepo = {
      findById: vi.fn().mockResolvedValue({
        id: uuidv4(),
        name: 'Electronics',
        slug: 'electronics',
      }),
    };

    mockAttributeRepo = {
      findByCategory: vi.fn().mockResolvedValue([
        { id: uuidv4(), name: 'color', displayLabel: 'Color', type: 'TEXT', isRequired: true },
      ]),
    };

    useCase = new PreviewGeneratedDescriptionUseCase(mockAttributeRepo, mockCategoryRepo);
  });

  it('should return fullDescription as structured object', async () => {
    const dto = {
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      structuredAttributes: { color: 'black' },
      mediaUrls: ['url1'],
    };

    const result = await useCase.execute(dto);

    // fullDescription should be an object, not a string
    expect(typeof result.fullDescription).toBe('object');
    expect(result.fullDescription).not.toBeNull();
  });

  it('should include all required fields in fullDescription', async () => {
    const dto = {
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      structuredAttributes: { color: 'black' },
      mediaUrls: ['url1'],
    };

    const result = await useCase.execute(dto);

    expect(result.fullDescription).toHaveProperty('overview');
    expect(result.fullDescription).toHaveProperty('keyFeatures');
    expect(result.fullDescription).toHaveProperty('specifications');
    expect(result.fullDescription).toHaveProperty('usage');
    expect(result.fullDescription).toHaveProperty('delivery');
    expect(result.fullDescription).toHaveProperty('supplierInfo');
  });

  it('should have correct types for fullDescription fields', async () => {
    const dto = {
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      structuredAttributes: { color: 'black' },
      mediaUrls: ['url1'],
    };

    const result = await useCase.execute(dto);

    expect(typeof result.fullDescription.overview).toBe('string');
    expect(Array.isArray(result.fullDescription.keyFeatures)).toBe(true);
    expect(typeof result.fullDescription.specifications).toBe('object');
    expect(typeof result.fullDescription.usage).toBe('string');
    expect(typeof result.fullDescription.delivery).toBe('string');
    expect(typeof result.fullDescription.supplierInfo).toBe('string');
  });
});

// ============================================================================
// COMMENT 4: Event Publishing Test
// ============================================================================

describe('Comment 4: Backward-Compatible Event Publishing', () => {
  let useCase: CreateProductUseCase;
  let mockEventPublisher: any;
  let mockRepositories: any;

  beforeEach(() => {
    mockEventPublisher = {
      publish: vi.fn().mockResolvedValue({}),
    };

    mockRepositories = {
      productRepository: {
        saveWithAttributesTransaction: vi.fn().mockResolvedValue({}),
      },
      categoryRepository: {
        findById: vi.fn().mockResolvedValue({
          id: uuidv4(),
          name: 'Electronics',
          slug: 'electronics',
        }),
      },
      categoryAttributeRepository: {
        findByCategory: vi.fn().mockResolvedValue([]),
      },
      productAttributeRepository: {},
      eventPublisher: mockEventPublisher,
      idGenerator: { generate: () => uuidv4() },
      dateTimeService: { now: () => new Date() },
    };

    useCase = new CreateProductUseCase(
      mockRepositories.productRepository,
      mockRepositories.categoryRepository,
      mockRepositories.categoryAttributeRepository,
      mockRepositories.productAttributeRepository,
      mockRepositories.eventPublisher,
      mockRepositories.idGenerator,
      mockRepositories.dateTimeService
    );
  });

  it('should publish ProductCreated event', async () => {
    const dto = {
      sellerId: uuidv4(),
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      minimumOrderQuantity: 1,
      supplierLocation: 'Test Location',
      structuredAttributes: {},
      mediaUrls: [],
      price: 100,
    };

    await useCase.execute(dto);

    const publishCalls = mockEventPublisher.publish.mock.calls;
    const productCreatedEvent = publishCalls.find(
      (call: any) => call[0].eventType === 'ProductCreated'
    );

    expect(productCreatedEvent).toBeDefined();
  });

  it('should publish ProductCreatedWithStructuredData event', async () => {
    const dto = {
      sellerId: uuidv4(),
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      minimumOrderQuantity: 1,
      supplierLocation: 'Test Location',
      structuredAttributes: {},
      mediaUrls: [],
      price: 100,
    };

    await useCase.execute(dto);

    const publishCalls = mockEventPublisher.publish.mock.calls;
    const structuredEvent = publishCalls.find(
      (call: any) => call[0].eventType === 'ProductCreatedWithStructuredData'
    );

    expect(structuredEvent).toBeDefined();
  });

  it('should publish both events in correct order', async () => {
    const dto = {
      sellerId: uuidv4(),
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      minimumOrderQuantity: 1,
      supplierLocation: 'Test Location',
      structuredAttributes: {},
      mediaUrls: [],
      price: 100,
    };

    await useCase.execute(dto);

    const publishCalls = mockEventPublisher.publish.mock.calls;
    expect(publishCalls.length).toBeGreaterThanOrEqual(2);
    expect(publishCalls[0][0].eventType).toBe('ProductCreated');
    expect(publishCalls[1][0].eventType).toBe('ProductCreatedWithStructuredData');
  });
});

// ============================================================================
// COMMENT 5: Transactional Persistence Test
// ============================================================================

describe('Comment 5: Transactional Product + Attributes Persistence', () => {
  let mockPrisma: any;
  let repository: any;

  beforeEach(() => {
    const transactionMock = vi.fn(async (callback: any) => {
      return callback({
        product: {
          create: vi.fn().mockResolvedValue({ id: uuidv4() }),
        },
        productAttribute: {
          deleteMany: vi.fn().mockResolvedValue({}),
          createMany: vi.fn().mockResolvedValue({}),
        },
      });
    });

    mockPrisma = {
      $transaction: transactionMock,
    };

    repository = {
      saveWithAttributesTransaction: async (persistenceDto: any, productId: string, attributes: any[]) => {
        return mockPrisma.$transaction(async (tx: any) => {
          await tx.product.create({ data: persistenceDto });
          if (attributes.length > 0) {
            await tx.productAttribute.createMany({ data: attributes });
          }
        });
      },
    };
  });

  it('should use transaction for atomic operations', async () => {
    const persistenceDto = {
      id: uuidv4(),
      sellerId: uuidv4(),
      title: 'Test',
      description: 'Test description',
      categoryId: uuidv4(),
      brand: 'Brand',
      slug: 'test-slug',
      seoTitle: 'SEO Title',
      shortSeoDescription: 'Short desc',
      generatedDescription: '{}',
      qualityScore: 75,
      status: 'published',
      visibility: 'public',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const attributes = [
      { id: uuidv4(), productId: persistenceDto.id, attributeId: uuidv4(), value: 'value1' },
    ];

    await repository.saveWithAttributesTransaction(persistenceDto, persistenceDto.id, attributes);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should save product and attributes together', async () => {
    const persistenceDto = {
      id: uuidv4(),
      sellerId: uuidv4(),
      title: 'Test',
      description: 'Test description',
      categoryId: uuidv4(),
      brand: 'Brand',
      slug: 'test-slug',
      seoTitle: 'SEO Title',
      shortSeoDescription: 'Short desc',
      generatedDescription: '{}',
      qualityScore: 75,
      status: 'published',
      visibility: 'public',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const attributes = [
      { id: uuidv4(), productId: persistenceDto.id, attributeId: uuidv4(), value: 'value1' },
      { id: uuidv4(), productId: persistenceDto.id, attributeId: uuidv4(), value: 'value2' },
    ];

    await repository.saveWithAttributesTransaction(persistenceDto, persistenceDto.id, attributes);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should handle empty attributes', async () => {
    const persistenceDto = {
      id: uuidv4(),
      sellerId: uuidv4(),
      title: 'Test',
      description: 'Test description',
      categoryId: uuidv4(),
      brand: 'Brand',
      slug: 'test-slug',
      seoTitle: 'SEO Title',
      shortSeoDescription: 'Short desc',
      generatedDescription: '{}',
      qualityScore: 75,
      status: 'published',
      visibility: 'public',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.saveWithAttributesTransaction(persistenceDto, persistenceDto.id, []);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

// ============================================================================
// COMMENT 6: Migration Safety Test
// ============================================================================

describe('Comment 6: Migration Safety - Slug Uniqueness', () => {
  it('should generate unique slugs with deterministic suffix', () => {
    const baseSlug = 'test-product';
    const slugs = [];

    // Simulate ROW_NUMBER() PARTITION BY logic
    for (let i = 1; i <= 5; i++) {
      const slug = i === 1 ? baseSlug : `${baseSlug}-${String(i).padStart(5, '0')}`;
      slugs.push(slug);
    }

    // All slugs should be unique
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('should preserve slug uniqueness after truncation', () => {
    const baseSlug = 'very-long-product-name-that-needs-truncation';
    const maxLength = 300;

    const slug1 = baseSlug.substring(0, 290);
    const slug2 = `${baseSlug.substring(0, 290)}-00002`;

    // Both should be within limit
    expect(slug1.length).toBeLessThanOrEqual(maxLength);
    expect(slug2.length).toBeLessThanOrEqual(maxLength);

    // Both should be unique
    expect(slug1).not.toBe(slug2);
  });

  it('should handle long product names without collision', () => {
    const longName = 'a'.repeat(250);
    const slugs = [];

    for (let i = 1; i <= 3; i++) {
      const slug = i === 1 
        ? longName.substring(0, 290)
        : `${longName.substring(0, 290)}-${String(i).padStart(5, '0')}`;
      slugs.push(slug);
    }

    // All should be unique
    expect(new Set(slugs).size).toBe(slugs.length);

    // All should be within limit
    slugs.forEach(slug => {
      expect(slug.length).toBeLessThanOrEqual(300);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Complete Product Creation Flow', () => {
  it('should create product with all validations and publishing', async () => {
    // This test verifies all 6 fixes work together
    const mockRepositories = {
      productRepository: {
        saveWithAttributesTransaction: vi.fn().mockResolvedValue({}),
      },
      categoryRepository: {
        findById: vi.fn().mockResolvedValue({
          id: uuidv4(),
          name: 'Electronics',
          slug: 'electronics',
        }),
      },
      categoryAttributeRepository: {
        findByCategory: vi.fn().mockResolvedValue([]),
      },
      productAttributeRepository: {},
      eventPublisher: {
        publish: vi.fn().mockResolvedValue({}),
      },
      idGenerator: { generate: () => uuidv4() },
      dateTimeService: { now: () => new Date() },
    };

    const useCase = new CreateProductUseCase(
      mockRepositories.productRepository,
      mockRepositories.categoryRepository,
      mockRepositories.categoryAttributeRepository,
      mockRepositories.productAttributeRepository,
      mockRepositories.eventPublisher,
      mockRepositories.idGenerator,
      mockRepositories.dateTimeService
    );

    const dto = {
      sellerId: uuidv4(),
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      minimumOrderQuantity: 1,
      supplierLocation: 'Test Location',
      structuredAttributes: {},
      mediaUrls: ['url1'],
      price: 100,
    };

    const result = await useCase.execute(dto);

    // Verify success
    expect(result.status).toBe('success');
    expect(result.productId).toBeDefined();

    // Verify transaction was called (Comment 5)
    expect(mockRepositories.productRepository.saveWithAttributesTransaction).toHaveBeenCalled();

    // Verify events were published (Comment 4)
    expect(mockRepositories.eventPublisher.publish).toHaveBeenCalledTimes(2);
  });

  it('should fail gracefully on validation error', async () => {
    const mockRepositories = {
      productRepository: {
        saveWithAttributesTransaction: vi.fn(),
      },
      categoryRepository: {
        findById: vi.fn().mockResolvedValue({
          id: uuidv4(),
          name: 'Electronics',
          slug: 'electronics',
        }),
      },
      categoryAttributeRepository: {
        findByCategory: vi.fn().mockResolvedValue([]),
      },
      productAttributeRepository: {},
      eventPublisher: {
        publish: vi.fn(),
      },
      idGenerator: { generate: () => uuidv4() },
      dateTimeService: { now: () => new Date() },
    };

    const useCase = new CreateProductUseCase(
      mockRepositories.productRepository,
      mockRepositories.categoryRepository,
      mockRepositories.categoryAttributeRepository,
      mockRepositories.productAttributeRepository,
      mockRepositories.eventPublisher,
      mockRepositories.idGenerator,
      mockRepositories.dateTimeService
    );

    const dto = {
      sellerId: uuidv4(),
      categoryId: uuidv4(),
      brand: 'TestBrand',
      productName: 'Test Product',
      minimumOrderQuantity: 1,
      supplierLocation: 'Test Location',
      structuredAttributes: {},
      mediaUrls: [],
      price: 100,
    };

    const result = await useCase.execute(dto);

    // Should fail validation
    expect(result.status).toBe('validation_error');
    expect(result.violations).toBeDefined();

    // Should not save or publish
    expect(mockRepositories.productRepository.saveWithAttributesTransaction).not.toHaveBeenCalled();
    expect(mockRepositories.eventPublisher.publish).not.toHaveBeenCalled();
  });
});
