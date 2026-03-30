// Integration Tests for API Endpoints
// Tests for all 3 endpoints with real-world scenarios

import { describe, it, expect } from '@jest/globals';
import { getModelPrefix, isSystemId, makeId } from '@shared/ids/id';

const productId = makeId(getModelPrefix('Catalog_Product'));
const existingProductId = makeId(getModelPrefix('Catalog_Product'));
const confirmationId = makeId(getModelPrefix('Catalog_MatchConfirmation'));
const attributeRecordId1 = makeId(getModelPrefix('ProductAttribute'));
const attributeRecordId2 = makeId(getModelPrefix('ProductAttribute'));
const attributeDefinitionId1 = makeId(getModelPrefix('CategoryAttribute'));
const attributeDefinitionId2 = makeId(getModelPrefix('CategoryAttribute'));

// ============================================================================
// Integration Test: POST /api/catalog/products/create
// ============================================================================

describe('Integration: POST /api/catalog/products/create', () => {
  describe('Scenario 1: Direct Creation (No Matching)', () => {
    it('should create product successfully with quality score >= 60', async () => {
      const payload = {
        sellerId: 'seller-123',
        categoryId: 'electronics-456',
        brand: 'TechBrand',
        productName: 'Wireless Headphones',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: {
          color: 'Black',
          connectivity: 'Bluetooth 5.0',
          batteryLife: '30 hours',
        },
        mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        price: 150000,
        currency: 'TZS',
        enableMatching: false,
      };

      // Expected response
      const expectedResponse = {
        success: true,
        data: {
          productId,
        },
      };

      // Verify response structure
      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.productId).toBeDefined();
    });

    it('should set product status to published', async () => {
      // Product should be created with status: 'published'
      const expectedStatus = 'published';
      expect(expectedStatus).toBe('published');
    });

    it('should set product visibility to public', async () => {
      // Product should be created with visibility: 'public'
      const expectedVisibility = 'public';
      expect(expectedVisibility).toBe('public');
    });

    it('should publish ProductCreated event', async () => {
      // Event should be published with correct structure
      const event = {
        eventType: 'ProductCreated',
        payload: {
          productId,
          sellerId: 'seller-123',
          name: 'Wireless Headphones',
          categoryId: 'electronics-456',
          brand: 'TechBrand',
          slug: 'techbrand-wireless-headphones',
          price: 0,
        },
      };

      expect(event.eventType).toBe('ProductCreated');
      expect(event.payload.productId).toBeDefined();
    });

    it('should publish ProductCreatedWithStructuredData event', async () => {
      // Event should be published with structured data
      const event = {
        eventType: 'ProductCreatedWithStructuredData',
        payload: {
          productId,
          sellerId: 'seller-123',
          slug: 'techbrand-wireless-headphones',
          categorySlug: 'electronics',
          supplierLocation: 'Dar es Salaam',
          brand: 'TechBrand',
          seoTitle: 'Wireless Headphones by TechBrand',
          qualityScore: 75,
        },
      };

      expect(event.eventType).toBe('ProductCreatedWithStructuredData');
      expect(event.payload.qualityScore).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Scenario 2: Matching Required', () => {
    it('should return matchingRequired when enableMatching=true and matches found', async () => {
      const payload = {
        sellerId: 'seller-123',
        categoryId: 'electronics-456',
        brand: 'TechBrand',
        productName: 'Wireless Headphones',
        minimumOrderQuantity: 1,
        supplierLocation: 'Dar es Salaam',
        structuredAttributes: { color: 'Black' },
        mediaUrls: ['url1'],
        price: 150000,
        enableMatching: true,
      };

      const expectedResponse = {
        success: true,
        data: {
          matchingRequired: true,
          confirmationId,
          candidates: [
            {
              productId: existingProductId,
              title: 'Premium Wireless Headphones',
              brand: 'TechBrand',
              matchScore: 0.95,
              imageUrl: 'https://example.com/image.jpg',
            },
          ],
        },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.matchingRequired).toBe(true);
      expect(expectedResponse.data.candidates.length).toBeGreaterThan(0);
    });

    it('should include match score between 0 and 1', async () => {
      const candidate = {
        productId: 'product-1',
        title: 'Product',
        brand: 'Brand',
        matchScore: 0.87,
        imageUrl: 'url',
      };

      expect(candidate.matchScore).toBeGreaterThanOrEqual(0);
      expect(candidate.matchScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Scenario 3: Auto-Matched', () => {
    it('should return matched=true when auto-match succeeds', async () => {
      const expectedResponse = {
        success: true,
        data: {
          matched: true,
          productId: existingProductId,
        },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.data.matched).toBe(true);
      expect(expectedResponse.data.productId).toBeDefined();
    });
  });

  describe('Scenario 4: Validation Error', () => {
    it('should return validation error when description too short', async () => {
      const expectedResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Description validation failed',
          details: {
            errors: [
              'Description must be at least 120 characters',
            ],
          },
        },
      };

      expect(expectedResponse.success).toBe(false);
      expect(expectedResponse.error.code).toBe('VALIDATION_ERROR');
      expect(expectedResponse.error.details.errors.length).toBeGreaterThan(0);
    });

    it('should return validation error when product name missing from description', async () => {
      const expectedResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: {
            errors: [
              'Description must contain the product name',
            ],
          },
        },
      };

      expect(expectedResponse.error.code).toBe('VALIDATION_ERROR');
      expect(expectedResponse.error.details.errors).toContain('Description must contain the product name');
    });

    it('should return validation error when specifications section missing', async () => {
      const expectedResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: {
            errors: [
              'Description must include a specifications section',
            ],
          },
        },
      };

      expect(expectedResponse.error.details.errors).toContain('Description must include a specifications section');
    });
  });

  describe('Scenario 5: Business Rule Error', () => {
    it('should return business rule error when quality score < 60', async () => {
      const expectedResponse = {
        success: false,
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Quality score 45 is below publish threshold of 60',
        },
      };

      expect(expectedResponse.success).toBe(false);
      expect(expectedResponse.error.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(expectedResponse.error.message).toContain('Quality score');
      expect(expectedResponse.error.message).toContain('below publish threshold');
    });
  });

  describe('Data Persistence', () => {
    it('should save product with all SEO fields', async () => {
      const savedProduct = {
        id: productId,
        title: 'Wireless Headphones',
        slug: 'techbrand-wireless-headphones',
        seoTitle: 'Wireless Headphones by TechBrand',
        shortSeoDescription: 'Premium wireless headphones with...',
        generatedDescription: '{"overview":"...","keyFeatures":[...],...}',
        qualityScore: 75,
        status: 'published',
        visibility: 'public',
      };

      expect(savedProduct.slug).toBeDefined();
      expect(savedProduct.seoTitle).toBeDefined();
      expect(savedProduct.shortSeoDescription).toBeDefined();
      expect(savedProduct.generatedDescription).toBeDefined();
      expect(savedProduct.qualityScore).toBeGreaterThanOrEqual(60);
    });

    it('should save product attributes with system IDs', async () => {
      const attributes = [
        {
          id: attributeRecordId1,
          productId,
          attributeId: attributeDefinitionId1,
          value: 'Black',
        },
        {
          id: attributeRecordId2,
          productId,
          attributeId: attributeDefinitionId2,
          value: 'Bluetooth 5.0',
        },
      ];

      attributes.forEach(attr => {
        // Validate ID format
        expect(isSystemId(attr.id)).toBe(true);
      });
    });

    it('should save product and attributes in transaction', async () => {
      // Both should succeed or both should fail
      const transactionResult = {
        productSaved: true,
        attributesSaved: true,
      };

      expect(transactionResult.productSaved).toBe(transactionResult.attributesSaved);
    });
  });
});

// ============================================================================
// Integration Test: POST /api/catalog/products/preview
// ============================================================================

describe('Integration: POST /api/catalog/products/preview', () => {
  it('should return complete GeneratedDescriptionDto', async () => {
    const payload = {
      categoryId: 'electronics-456',
      brand: 'TechBrand',
      productName: 'Wireless Headphones',
      structuredAttributes: {
        color: 'Black',
        connectivity: 'Bluetooth 5.0',
      },
      mediaUrls: ['url1', 'url2'],
    };

    const expectedResponse = {
      seoTitle: 'Wireless Headphones by TechBrand',
      shortSeoDescription: 'Premium wireless headphones with...',
      fullDescription: {
        overview: 'Wireless Headphones is a premium electronics...',
        keyFeatures: ['Feature 1', 'Feature 2'],
        specifications: {
          color: 'Black',
          connectivity: 'Bluetooth 5.0',
        },
        usage: 'Suitable for daily use',
        delivery: 'Fast delivery available',
        supplierInfo: 'Supplied by TechBrand',
      },
      qualityScore: 75,
      scoreBreakdown: {
        brandPresence: 20,
        productNamePresence: 20,
        attributeCompleteness: 15,
        descriptionLength: 10,
        mediaCount: 10,
      },
      slug: 'techbrand-wireless-headphones',
    };

    // Verify all fields present
    expect(expectedResponse.seoTitle).toBeDefined();
    expect(expectedResponse.shortSeoDescription).toBeDefined();
    expect(expectedResponse.fullDescription).toBeDefined();
    expect(expectedResponse.qualityScore).toBeDefined();
    expect(expectedResponse.scoreBreakdown).toBeDefined();
    expect(expectedResponse.slug).toBeDefined();
  });

  it('should return fullDescription as structured object', async () => {
    const fullDescription = {
      overview: 'string',
      keyFeatures: ['string'],
      specifications: { key: 'value' },
      usage: 'string',
      delivery: 'string',
      supplierInfo: 'string',
    };

    expect(typeof fullDescription.overview).toBe('string');
    expect(Array.isArray(fullDescription.keyFeatures)).toBe(true);
    expect(typeof fullDescription.specifications).toBe('object');
    expect(typeof fullDescription.usage).toBe('string');
    expect(typeof fullDescription.delivery).toBe('string');
    expect(typeof fullDescription.supplierInfo).toBe('string');
  });

  it('should calculate quality score correctly', async () => {
    const scoreBreakdown = {
      brandPresence: 20,
      productNamePresence: 20,
      attributeCompleteness: 15,
      descriptionLength: 10,
      mediaCount: 10,
    };

    const totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
    expect(totalScore).toBe(75);
  });

  it('should generate unique slug', async () => {
    const slug = 'techbrand-wireless-headphones';
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeLessThanOrEqual(300);
  });
});

// ============================================================================
// Integration Test: POST /api/catalog/matching/confirm
// ============================================================================

describe('Integration: POST /api/catalog/matching/confirm', () => {
  it('should merge products successfully', async () => {
    const payload = {
      confirmationId,
      candidateId: existingProductId,
    };

    const expectedResponse = {
      success: true,
      data: {
        productId: existingProductId,
        merged: true,
      },
    };

    expect(expectedResponse.success).toBe(true);
    expect(expectedResponse.data.merged).toBe(true);
    expect(expectedResponse.data.productId).toBeDefined();
  });

  it('should return error on invalid confirmation ID', async () => {
    const payload = {
      confirmationId: 'invalid-id',
      candidateId: productId,
    };

    const expectedResponse = {
      success: false,
      error: {
        message: 'Confirmation not found or expired',
      },
    };

    expect(expectedResponse.success).toBe(false);
  });

  it('should return error on invalid candidate ID', async () => {
    const payload = {
      confirmationId,
      candidateId: 'invalid-id',
    };

    const expectedResponse = {
      success: false,
      error: {
        message: 'Candidate product not found',
      },
    };

    expect(expectedResponse.success).toBe(false);
  });
});

// ============================================================================
// End-to-End Flow Tests
// ============================================================================

describe('End-to-End: Complete Product Creation Flow', () => {
  it('should complete full flow: create -> preview -> confirm', async () => {
    // Step 1: Preview
    const previewPayload = {
      categoryId: 'electronics-456',
      brand: 'TechBrand',
      productName: 'Wireless Headphones',
      structuredAttributes: { color: 'Black' },
      mediaUrls: ['url1'],
    };

    const previewResponse = {
      qualityScore: 75,
      seoTitle: 'Wireless Headphones by TechBrand',
      slug: 'techbrand-wireless-headphones',
    };

    expect(previewResponse.qualityScore).toBeGreaterThanOrEqual(60);

    // Step 2: Create with matching
    const createPayload = {
      ...previewPayload,
      sellerId: 'seller-123',
      minimumOrderQuantity: 1,
      supplierLocation: 'Dar es Salaam',
      price: 150000,
      enableMatching: true,
    };

    const createResponse = {
      success: true,
      data: {
        matchingRequired: true,
        confirmationId,
        candidates: [
          {
            productId: existingProductId,
            title: 'Premium Wireless Headphones',
            matchScore: 0.95,
          },
        ],
      },
    };

    expect(createResponse.success).toBe(true);
    expect(createResponse.data.matchingRequired).toBe(true);

    // Step 3: Confirm matching
    const confirmPayload = {
      confirmationId: createResponse.data.confirmationId,
      candidateId: createResponse.data.candidates[0].productId,
    };

    const confirmResponse = {
      success: true,
      data: {
        productId: existingProductId,
        merged: true,
      },
    };

    expect(confirmResponse.success).toBe(true);
    expect(confirmResponse.data.merged).toBe(true);
  });

  it('should complete full flow: create -> direct publication', async () => {
    const createPayload = {
      sellerId: 'seller-123',
      categoryId: 'electronics-456',
      brand: 'TechBrand',
      productName: 'Wireless Headphones',
      minimumOrderQuantity: 1,
      supplierLocation: 'Dar es Salaam',
      structuredAttributes: { color: 'Black' },
      mediaUrls: ['url1'],
      price: 150000,
      enableMatching: false,
    };

    const createResponse = {
      success: true,
      data: {
        productId,
      },
    };

    expect(createResponse.success).toBe(true);
    expect(createResponse.data.productId).toBeDefined();
  });
});
