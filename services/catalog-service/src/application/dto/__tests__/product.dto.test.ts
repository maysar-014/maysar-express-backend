/**
 * Product DTO Test Suite
 * Tests for product data transfer objects
 */

import { 
  CreateProductDto, 
  UpdateProductDto, 
  ProductSummaryDto, 
  ProductDetailsDto, 
  ProductSearchDto,
  ProductInventoryDto,
  UpdateInventoryDto,
  ProductAnalyticsDto,
  ProductValidationDto
} from '../product.dto';

describe('Product DTOs', () => {
  describe('CreateProductDto', () => {
    it('should create valid CreateProductDto', () => {
      const createData: CreateProductDto = {
        sellerId: 'seller-123',
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        currency: 'USD',
        categoryId: 'category-123',
        type: 'PHYSICAL' as any,
        tags: ['test', 'product'],
        mediaUrls: ['image1.jpg', 'image2.jpg'],
        inventoryCount: 100,
        attributes: {
          color: 'red',
          size: 'M'
        },
        seoTitle: 'Test Product SEO Title',
        seoDescription: 'Test Product SEO Description'
      };

      expect(createData.sellerId).toBe('seller-123');
      expect(createData.name).toBe('Test Product');
      expect(createData.description).toBe('A test product');
      expect(createData.price).toBe(99.99);
      expect(createData.currency).toBe('USD');
      expect(createData.categoryId).toBe('category-123');
      expect(createData.type).toBe('PHYSICAL');
      expect(createData.tags).toEqual(['test', 'product']);
      expect(createData.mediaUrls).toEqual(['image1.jpg', 'image2.jpg']);
      expect(createData.inventoryCount).toBe(100);
      expect(createData.attributes).toEqual({
        color: 'red',
        size: 'M'
      });
      expect(createData.seoTitle).toBe('Test Product SEO Title');
      expect(createData.seoDescription).toBe('Test Product SEO Description');
    });

    it('should handle minimal CreateProductDto', () => {
      const createData: CreateProductDto = {
        sellerId: 'seller-minimal',
        name: 'Minimal Product',
        description: 'A minimal product',
        price: 10.00,
        categoryId: 'category-minimal',
        type: 'DIGITAL' as any,
        tags: [],
        mediaUrls: [],
        inventoryCount: 50,
        attributes: {}
      };

      expect(createData.sellerId).toBe('seller-minimal');
      expect(createData.name).toBe('Minimal Product');
      expect(createData.description).toBe('A minimal product');
      expect(createData.price).toBe(10.00);
      expect(createData.categoryId).toBe('category-minimal');
      expect(createData.type).toBe('DIGITAL');
      expect(createData.tags).toEqual([]);
      expect(createData.mediaUrls).toEqual([]);
      expect(createData.inventoryCount).toBe(50);
      expect(createData.attributes).toEqual({});
      expect(createData.seoTitle).toBeUndefined();
      expect(createData.seoDescription).toBeUndefined();
    });

    it('should handle optional currency', () => {
      const createData: CreateProductDto = {
        sellerId: 'seller-currency',
        name: 'Currency Product',
        description: 'A product with default currency',
        price: 25.00,
        categoryId: 'category-currency',
        type: 'PHYSICAL' as any,
        tags: ['currency'],
        mediaUrls: [],
        inventoryCount: 75,
        attributes: {}
      };

      expect(createData.currency).toBeUndefined();
    });
  });

  describe('UpdateProductDto', () => {
    it('should create valid UpdateProductDto', () => {
      const updateData: UpdateProductDto = {
        productId: 'product-123',
        name: 'Updated Product',
        description: 'An updated product',
        price: 89.99,
        currency: 'EUR',
        categoryId: 'category-updated',
        tags: ['updated', 'product'],
        attributes: {
          color: 'blue',
          size: 'L'
        },
        seoTitle: 'Updated Product SEO Title',
        seoDescription: 'Updated Product SEO Description'
      };

      expect(updateData.productId).toBe('product-123');
      expect(updateData.name).toBe('Updated Product');
      expect(updateData.description).toBe('An updated product');
      expect(updateData.price).toBe(89.99);
      expect(updateData.currency).toBe('EUR');
      expect(updateData.categoryId).toBe('category-updated');
      expect(updateData.tags).toEqual(['updated', 'product']);
      expect(updateData.attributes).toEqual({
        color: 'blue',
        size: 'L'
      });
      expect(updateData.seoTitle).toBe('Updated Product SEO Title');
      expect(updateData.seoDescription).toBe('Updated Product SEO Description');
    });

    it('should handle partial UpdateProductDto', () => {
      const updateData: UpdateProductDto = {
        productId: 'product-partial',
        name: 'Partially Updated Product',
        price: 50.00
      };

      expect(updateData.productId).toBe('product-partial');
      expect(updateData.name).toBe('Partially Updated Product');
      expect(updateData.price).toBe(50.00);
      expect(updateData.description).toBeUndefined();
      expect(updateData.currency).toBeUndefined();
      expect(updateData.categoryId).toBeUndefined();
      expect(updateData.tags).toBeUndefined();
      expect(updateData.attributes).toBeUndefined();
      expect(updateData.seoTitle).toBeUndefined();
      expect(updateData.seoDescription).toBeUndefined();
    });

    it('should handle empty UpdateProductDto', () => {
      const updateData: UpdateProductDto = {
        productId: 'product-empty'
      };

      expect(updateData.productId).toBe('product-empty');
      expect(updateData.name).toBeUndefined();
      expect(updateData.description).toBeUndefined();
      expect(updateData.price).toBeUndefined();
      expect(updateData.currency).toBeUndefined();
      expect(updateData.categoryId).toBeUndefined();
      expect(updateData.tags).toBeUndefined();
      expect(updateData.attributes).toBeUndefined();
      expect(updateData.seoTitle).toBeUndefined();
      expect(updateData.seoDescription).toBeUndefined();
    });
  });

  describe('ProductSummaryDto', () => {
    it('should create valid ProductSummaryDto', () => {
      const summaryData: ProductSummaryDto = {
        id: 'product-summary',
        name: 'Summary Product',
        price: {
          amount: 75.00,
          currency: 'USD'
        },
        categoryId: 'category-summary',
        categoryName: 'Summary Category',
        sellerId: 'seller-summary',
        sellerName: 'Summary Seller',
        type: 'PHYSICAL',
        tags: ['summary', 'product'],
        status: 'active',
        thumbnailUrl: 'thumbnail.jpg',
        averageRating: 4.5,
        reviewCount: 120,
        createdAt: new Date('2023-01-01')
      };

      expect(summaryData.id).toBe('product-summary');
      expect(summaryData.name).toBe('Summary Product');
      expect(summaryData.price).toEqual({
        amount: 75.00,
        currency: 'USD'
      });
      expect(summaryData.categoryId).toBe('category-summary');
      expect(summaryData.categoryName).toBe('Summary Category');
      expect(summaryData.sellerId).toBe('seller-summary');
      expect(summaryData.sellerName).toBe('Summary Seller');
      expect(summaryData.type).toBe('PHYSICAL');
      expect(summaryData.tags).toEqual(['summary', 'product']);
      expect(summaryData.status).toBe('active');
      expect(summaryData.thumbnailUrl).toBe('thumbnail.jpg');
      expect(summaryData.averageRating).toBe(4.5);
      expect(summaryData.reviewCount).toBe(120);
      expect(summaryData.createdAt).toEqual(new Date('2023-01-01'));
    });

    it('should handle minimal ProductSummaryDto', () => {
      const summaryData: ProductSummaryDto = {
        id: 'product-minimal-summary',
        name: 'Minimal Summary Product',
        price: {
          amount: 15.00,
          currency: 'USD'
        },
        categoryId: 'category-minimal-summary',
        sellerId: 'seller-minimal-summary',
        type: 'DIGITAL',
        tags: [],
        status: 'draft',
        createdAt: new Date('2023-01-01')
      };

      expect(summaryData.id).toBe('product-minimal-summary');
      expect(summaryData.name).toBe('Minimal Summary Product');
      expect(summaryData.price).toEqual({
        amount: 15.00,
        currency: 'USD'
      });
      expect(summaryData.categoryId).toBe('category-minimal-summary');
      expect(summaryData.sellerId).toBe('seller-minimal-summary');
      expect(summaryData.type).toBe('DIGITAL');
      expect(summaryData.tags).toEqual([]);
      expect(summaryData.status).toBe('draft');
      expect(summaryData.categoryName).toBeUndefined();
      expect(summaryData.sellerName).toBeUndefined();
      expect(summaryData.thumbnailUrl).toBeUndefined();
      expect(summaryData.averageRating).toBeUndefined();
      expect(summaryData.reviewCount).toBeUndefined();
      expect(summaryData.createdAt).toEqual(new Date('2023-01-01'));
    });
  });

  describe('ProductDetailsDto', () => {
    it('should create valid ProductDetailsDto', () => {
      const detailsData: ProductDetailsDto = {
        id: 'product-details',
        sellerId: 'seller-details',
        sellerName: 'Details Seller',
        name: 'Details Product',
        description: 'A detailed product',
        price: {
          amount: 99.99,
          currency: 'USD',
          originalPrice: 129.99,
          discountPercentage: 23.08
        },
        categoryId: 'category-details',
        categoryName: 'Details Category',
        categoryPath: ['Electronics', 'Phones', 'Smartphones'],
        type: 'PHYSICAL',
        tags: ['details', 'product'],
        attributes: {
          color: 'black',
          storage: '128GB',
          ram: '8GB'
        },
        status: 'active',
        visibility: 'public',
        media: [
          {
            id: 'media-1',
            url: 'image1.jpg',
            type: 'image',
            altText: 'Product image 1',
            order: 1,
            isPrimary: true
          },
          {
            id: 'media-2',
            url: 'image2.jpg',
            type: 'image',
            altText: 'Product image 2',
            order: 2,
            isPrimary: false
          }
        ],
        inventory: {
          available: 100,
          reserved: 5,
          total: 105,
          status: 'in_stock',
          lowStockThreshold: 10
        },
        shipping: {
          weight: 0.5,
          dimensions: {
            length: 15,
            width: 8,
            height: 1,
            unit: 'cm'
          },
          freeShipping: true,
          shippingCost: 0
        },
        seo: {
          title: 'Details Product SEO Title',
          description: 'Details Product SEO Description',
          keywords: ['details', 'product', 'seo']
        },
        analytics: {
          viewCount: 1000,
          purchaseCount: 50,
          favoriteCount: 25,
          shareCount: 10
        },
        ratings: {
          average: 4.2,
          count: 150,
          distribution: {
            1: 5,
            2: 10,
            3: 20,
            4: 60,
            5: 55
          }
        },
        reviews: [
          {
            id: 'review-1',
            userId: 'user-1',
            userName: 'User 1',
            rating: 5,
            title: 'Great product!',
            content: 'This product is amazing.',
            verified: true,
            helpful: 10,
            createdAt: new Date('2023-01-01')
          }
        ],
        recommendations: [
          {
            productId: 'product-rec-1',
            name: 'Recommended Product 1',
            price: 79.99,
            thumbnailUrl: 'rec1.jpg',
            relevanceScore: 0.8,
            reason: 'Based on your interests'
          }
        ],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        publishedAt: new Date('2023-01-03')
      };

      expect(detailsData.id).toBe('product-details');
      expect(detailsData.sellerId).toBe('seller-details');
      expect(detailsData.sellerName).toBe('Details Seller');
      expect(detailsData.name).toBe('Details Product');
      expect(detailsData.description).toBe('A detailed product');
      expect(detailsData.price).toEqual({
        amount: 99.99,
        currency: 'USD',
        originalPrice: 129.99,
        discountPercentage: 23.08
      });
      expect(detailsData.categoryId).toBe('category-details');
      expect(detailsData.categoryName).toBe('Details Category');
      expect(detailsData.categoryPath).toEqual(['Electronics', 'Phones', 'Smartphones']);
      expect(detailsData.type).toBe('PHYSICAL');
      expect(detailsData.tags).toEqual(['details', 'product']);
      expect(detailsData.attributes).toEqual({
        color: 'black',
        storage: '128GB',
        ram: '8GB'
      });
      expect(detailsData.status).toBe('active');
      expect(detailsData.visibility).toBe('public');
      expect(detailsData.media).toHaveLength(2);
      expect(detailsData.inventory).toEqual({
        available: 100,
        reserved: 5,
        total: 105,
        status: 'in_stock',
        lowStockThreshold: 10
      });
      expect(detailsData.shipping).toEqual({
        weight: 0.5,
        dimensions: {
          length: 15,
          width: 8,
          height: 1,
          unit: 'cm'
        },
        freeShipping: true,
        shippingCost: 0
      });
      expect(detailsData.seo).toEqual({
        title: 'Details Product SEO Title',
        description: 'Details Product SEO Description',
        keywords: ['details', 'product', 'seo']
      });
      expect(detailsData.analytics).toEqual({
        viewCount: 1000,
        purchaseCount: 50,
        favoriteCount: 25,
        shareCount: 10
      });
      expect(detailsData.ratings).toEqual({
        average: 4.2,
        count: 150,
        distribution: {
          1: 5,
          2: 10,
          3: 20,
          4: 60,
          5: 55
        }
      });
      expect(detailsData.reviews).toHaveLength(1);
      expect(detailsData.recommendations).toHaveLength(1);
      expect(detailsData.createdAt).toEqual(new Date('2023-01-01'));
      expect(detailsData.updatedAt).toEqual(new Date('2023-01-02'));
      expect(detailsData.publishedAt).toEqual(new Date('2023-01-03'));
    });

    it('should handle minimal ProductDetailsDto', () => {
      const detailsData: ProductDetailsDto = {
        id: 'product-minimal-details',
        sellerId: 'seller-minimal-details',
        name: 'Minimal Details Product',
        description: 'A minimal detailed product',
        price: {
          amount: 20.00,
          currency: 'USD'
        },
        categoryId: 'category-minimal-details',
        type: 'DIGITAL',
        tags: [],
        status: 'draft',
        visibility: 'private',
        media: [],
        inventory: {
          available: 0,
          reserved: 0,
          total: 0,
          status: 'out_of_stock'
        },
        shipping: {
          freeShipping: false
        },
        seo: {},
        analytics: {
          viewCount: 0,
          purchaseCount: 0,
          favoriteCount: 0,
          shareCount: 0
        },
        ratings: {
          average: 0,
          count: 0,
          distribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          }
        },
        reviews: [],
        recommendations: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        attributes: {}
      };

      expect(detailsData.id).toBe('product-minimal-details');
      expect(detailsData.sellerId).toBe('seller-minimal-details');
      expect(detailsData.name).toBe('Minimal Details Product');
      expect(detailsData.description).toBe('A minimal detailed product');
      expect(detailsData.price).toEqual({
        amount: 20.00,
        currency: 'USD'
      });
      expect(detailsData.categoryId).toBe('category-minimal-details');
      expect(detailsData.type).toBe('DIGITAL');
      expect(detailsData.tags).toEqual([]);
      expect(detailsData.status).toBe('draft');
      expect(detailsData.visibility).toBe('private');
      expect(detailsData.media).toEqual([]);
      expect(detailsData.inventory).toEqual({
        available: 0,
        reserved: 0,
        total: 0,
        status: 'out_of_stock'
      });
      expect(detailsData.shipping).toEqual({
        freeShipping: false
      });
      expect(detailsData.seo).toEqual({});
      expect(detailsData.analytics).toEqual({
        viewCount: 0,
        purchaseCount: 0,
        favoriteCount: 0,
        shareCount: 0
      });
      expect(detailsData.ratings).toEqual({
        average: 0,
        count: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      });
      expect(detailsData.reviews).toEqual([]);
      expect(detailsData.recommendations).toEqual([]);
      expect(detailsData.createdAt).toEqual(new Date('2023-01-01'));
      expect(detailsData.updatedAt).toEqual(new Date('2023-01-01'));
      expect(detailsData.publishedAt).toBeUndefined();
      expect(detailsData.categoryName).toBeUndefined();
      expect(detailsData.categoryPath).toBeUndefined();
      expect(detailsData.attributes).toEqual({});
      expect(detailsData.sellerName).toBeUndefined();
    });
  });

  describe('ProductSearchDto', () => {
    it('should create valid ProductSearchDto', () => {
      const searchData: ProductSearchDto = {
        query: 'test product',
        filters: {
          category: 'electronics',
          categories: ['phones', 'laptops'],
          seller: 'seller-123',
          priceRange: {
            min: 100,
            max: 1000
          },
          productType: 'PHYSICAL' as any,
          tags: ['tag1', 'tag2'],
          inStock: true,
          status: 'active',
          rating: {
            min: 4,
            max: 5
          },
          attributes: {
            color: 'red',
            size: 'M'
          },
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            radius: 50
          }
        },
        sorting: {
          field: 'price',
          direction: 'asc'
        },
        pagination: {
          page: 1,
          limit: 20
        },
        includeFacets: true,
        includeSuggestions: true
      };

      expect(searchData.query).toBe('test product');
      expect(searchData.filters).toEqual({
        category: 'electronics',
        categories: ['phones', 'laptops'],
        seller: 'seller-123',
        priceRange: {
          min: 100,
          max: 1000
        },
        productType: 'PHYSICAL',
        tags: ['tag1', 'tag2'],
        inStock: true,
        status: 'active',
        rating: {
          min: 4,
          max: 5
        },
        attributes: {
          color: 'red',
          size: 'M'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 50
        }
      });
      expect(searchData.sorting).toEqual({
        field: 'price',
        direction: 'asc'
      });
      expect(searchData.pagination).toEqual({
        page: 1,
        limit: 20
      });
      expect(searchData.includeFacets).toBe(true);
      expect(searchData.includeSuggestions).toBe(true);
    });

    it('should handle minimal ProductSearchDto', () => {
      const searchData: ProductSearchDto = {
        filters: {},
        sorting: {
          field: 'relevance',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 10
        }
      };

      expect(searchData.query).toBeUndefined();
      expect(searchData.filters).toEqual({});
      expect(searchData.sorting).toEqual({
        field: 'relevance',
        direction: 'desc'
      });
      expect(searchData.pagination).toEqual({
        page: 1,
        limit: 10
      });
      expect(searchData.includeFacets).toBeUndefined();
      expect(searchData.includeSuggestions).toBeUndefined();
    });

    it('should handle empty filters', () => {
      const searchData: ProductSearchDto = {
        filters: {},
        sorting: {
          field: 'newest',
          direction: 'desc'
        },
        pagination: {
          page: 1,
          limit: 20
        }
      };

      expect(searchData.filters).toEqual({});
    });
  });

  describe('ProductInventoryDto', () => {
    it('should create valid ProductInventoryDto', () => {
      const inventoryData: ProductInventoryDto = {
        productId: 'product-inventory',
        variantId: 'variant-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        reorderPoint: 20,
        maxStock: 500,
        status: 'in_stock',
        lastUpdated: new Date('2023-01-01'),
        location: 'warehouse-1',
        supplierInfo: {
          supplierId: 'supplier-1',
          supplierName: 'Supplier 1',
          leadTime: 7,
          minimumOrder: 50
        }
      };

      expect(inventoryData.productId).toBe('product-inventory');
      expect(inventoryData.variantId).toBe('variant-1');
      expect(inventoryData.currentStock).toBe(100);
      expect(inventoryData.reservedStock).toBe(10);
      expect(inventoryData.availableStock).toBe(90);
      expect(inventoryData.reorderPoint).toBe(20);
      expect(inventoryData.maxStock).toBe(500);
      expect(inventoryData.status).toBe('in_stock');
      expect(inventoryData.lastUpdated).toEqual(new Date('2023-01-01'));
      expect(inventoryData.location).toBe('warehouse-1');
      expect(inventoryData.supplierInfo).toEqual({
        supplierId: 'supplier-1',
        supplierName: 'Supplier 1',
        leadTime: 7,
        minimumOrder: 50
      });
    });

    it('should handle minimal ProductInventoryDto', () => {
      const inventoryData: ProductInventoryDto = {
        productId: 'product-minimal-inventory',
        currentStock: 0,
        reservedStock: 0,
        availableStock: 0,
        status: 'out_of_stock',
        lastUpdated: new Date('2023-01-01')
      };

      expect(inventoryData.productId).toBe('product-minimal-inventory');
      expect(inventoryData.currentStock).toBe(0);
      expect(inventoryData.reservedStock).toBe(0);
      expect(inventoryData.availableStock).toBe(0);
      expect(inventoryData.status).toBe('out_of_stock');
      expect(inventoryData.lastUpdated).toEqual(new Date('2023-01-01'));
      expect(inventoryData.variantId).toBeUndefined();
      expect(inventoryData.reorderPoint).toBeUndefined();
      expect(inventoryData.maxStock).toBeUndefined();
      expect(inventoryData.location).toBeUndefined();
      expect(inventoryData.supplierInfo).toBeUndefined();
    });
  });

  describe('UpdateInventoryDto', () => {
    it('should create valid UpdateInventoryDto', () => {
      const updateData: UpdateInventoryDto = {
        productId: 'product-update-inventory',
        variantId: 'variant-1',
        quantity: 50,
        operation: 'add',
        reason: 'Restock from supplier',
        location: 'warehouse-1',
        reference: 'PO-12345'
      };

      expect(updateData.productId).toBe('product-update-inventory');
      expect(updateData.variantId).toBe('variant-1');
      expect(updateData.quantity).toBe(50);
      expect(updateData.operation).toBe('add');
      expect(updateData.reason).toBe('Restock from supplier');
      expect(updateData.location).toBe('warehouse-1');
      expect(updateData.reference).toBe('PO-12345');
    });

    it('should handle minimal UpdateInventoryDto', () => {
      const updateData: UpdateInventoryDto = {
        productId: 'product-minimal-update-inventory',
        quantity: 10,
        operation: 'set'
      };

      expect(updateData.productId).toBe('product-minimal-update-inventory');
      expect(updateData.quantity).toBe(10);
      expect(updateData.operation).toBe('set');
      expect(updateData.variantId).toBeUndefined();
      expect(updateData.reason).toBeUndefined();
      expect(updateData.location).toBeUndefined();
      expect(updateData.reference).toBeUndefined();
    });

    it('should handle different operations', () => {
      const operations = ['set', 'add', 'subtract', 'reserve', 'release'];
      
      operations.forEach(operation => {
        const updateData: UpdateInventoryDto = {
          productId: 'product-operation',
          quantity: 10,
          operation: operation as any
        };

        expect(updateData.operation).toBe(operation);
      });
    });
  });

  describe('ProductAnalyticsDto', () => {
    it('should create valid ProductAnalyticsDto', () => {
      const analyticsData: ProductAnalyticsDto = {
        productId: 'product-analytics',
        period: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31')
        },
        metrics: {
          views: 1000,
          uniqueViews: 800,
          addToCart: 100,
          purchases: 50,
          conversionRate: 5.0,
          averageOrderValue: 75.00,
          revenue: 3750.00,
          profit: 1500.00,
          margin: 40.0
        },
        trends: {
          views: [
            { date: '2023-01-01', count: 50 },
            { date: '2023-01-02', count: 60 }
          ],
          purchases: [
            { date: '2023-01-01', count: 2 },
            { date: '2023-01-02', count: 3 }
          ],
          revenue: [
            { date: '2023-01-01', amount: 150.00 },
            { date: '2023-01-02', amount: 225.00 }
          ]
        },
        demographics: {
          ageGroups: {
            '18-25': 200,
            '26-35': 300,
            '36-45': 250,
            '46+': 250
          },
          genders: {
            male: 500,
            female: 500
          },
          locations: {
            'USA': 600,
            'Canada': 200,
            'UK': 200
          },
          devices: {
            mobile: 600,
            desktop: 300,
            tablet: 100
          }
        },
        sources: {
          direct: 400,
          search: 300,
          social: 200,
          email: 50,
          referral: 50
        }
      };

      expect(analyticsData.productId).toBe('product-analytics');
      expect(analyticsData.period).toEqual({
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      });
      expect(analyticsData.metrics).toEqual({
        views: 1000,
        uniqueViews: 800,
        addToCart: 100,
        purchases: 50,
        conversionRate: 5.0,
        averageOrderValue: 75.00,
        revenue: 3750.00,
        profit: 1500.00,
        margin: 40.0
      });
      expect(analyticsData.trends).toEqual({
        views: [
          { date: '2023-01-01', count: 50 },
          { date: '2023-01-02', count: 60 }
        ],
        purchases: [
          { date: '2023-01-01', count: 2 },
          { date: '2023-01-02', count: 3 }
        ],
        revenue: [
          { date: '2023-01-01', amount: 150.00 },
          { date: '2023-01-02', amount: 225.00 }
        ]
      });
      expect(analyticsData.demographics).toEqual({
        ageGroups: {
          '18-25': 200,
          '26-35': 300,
          '36-45': 250,
          '46+': 250
        },
        genders: {
          male: 500,
          female: 500
        },
        locations: {
          'USA': 600,
          'Canada': 200,
          'UK': 200
        },
        devices: {
          mobile: 600,
          desktop: 300,
          tablet: 100
        }
      });
      expect(analyticsData.sources).toEqual({
        direct: 400,
        search: 300,
        social: 200,
        email: 50,
        referral: 50
      });
    });

    it('should handle minimal ProductAnalyticsDto', () => {
      const analyticsData: ProductAnalyticsDto = {
        productId: 'product-minimal-analytics',
        period: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31')
        },
        metrics: {
          views: 0,
          uniqueViews: 0,
          addToCart: 0,
          purchases: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          revenue: 0,
          profit: 0,
          margin: 0
        },
        trends: {
          views: [],
          purchases: [],
          revenue: []
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {}
        },
        sources: {
          direct: 0,
          search: 0,
          social: 0,
          email: 0,
          referral: 0
        }
      };

      expect(analyticsData.productId).toBe('product-minimal-analytics');
      expect(analyticsData.period).toEqual({
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31')
      });
      expect(analyticsData.metrics).toEqual({
        views: 0,
        uniqueViews: 0,
        addToCart: 0,
        purchases: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        revenue: 0,
        profit: 0,
        margin: 0
      });
      expect(analyticsData.trends).toEqual({
        views: [],
        purchases: [],
        revenue: []
      });
      expect(analyticsData.demographics).toEqual({
        ageGroups: {},
        genders: {},
        locations: {},
        devices: {}
      });
      expect(analyticsData.sources).toEqual({
        direct: 0,
        search: 0,
        social: 0,
        email: 0,
        referral: 0
      });
    });
  });

  describe('ProductValidationDto', () => {
    it('should create valid ProductValidationDto', () => {
      const validationData: ProductValidationDto = {
        isValid: false,
        errors: [
          {
            field: 'name',
            code: 'REQUIRED',
            message: 'Product name is required',
            severity: 'error'
          },
          {
            field: 'price',
            code: 'INVALID',
            message: 'Price must be positive',
            severity: 'error'
          }
        ],
        warnings: [
          {
            field: 'description',
            code: 'TOO_SHORT',
            message: 'Description should be longer for better SEO'
          }
        ],
        suggestions: [
          {
            field: 'images',
            type: 'improvement',
            message: 'Add more product images for better conversion',
            impact: 'medium'
          },
          {
            field: 'seo',
            type: 'optimization',
            message: 'Optimize SEO title and description',
            impact: 'high'
          }
        ]
      };

      expect(validationData.isValid).toBe(false);
      expect(validationData.errors).toEqual([
        {
          field: 'name',
          code: 'REQUIRED',
          message: 'Product name is required',
          severity: 'error'
        },
        {
          field: 'price',
          code: 'INVALID',
          message: 'Price must be positive',
          severity: 'error'
        }
      ]);
      expect(validationData.warnings).toEqual([
        {
          field: 'description',
          code: 'TOO_SHORT',
          message: 'Description should be longer for better SEO'
        }
      ]);
      expect(validationData.suggestions).toEqual([
        {
          field: 'images',
          type: 'improvement',
          message: 'Add more product images for better conversion',
          impact: 'medium'
        },
        {
          field: 'seo',
          type: 'optimization',
          message: 'Optimize SEO title and description',
          impact: 'high'
        }
      ]);
    });

    it('should handle valid ProductValidationDto', () => {
      const validationData: ProductValidationDto = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      expect(validationData.isValid).toBe(true);
      expect(validationData.errors).toEqual([]);
      expect(validationData.warnings).toEqual([]);
      expect(validationData.suggestions).toEqual([]);
    });

    it('should handle only errors', () => {
      const validationData: ProductValidationDto = {
        isValid: false,
        errors: [
          {
            field: 'name',
            code: 'REQUIRED',
            message: 'Product name is required',
            severity: 'error'
          }
        ],
        warnings: [],
        suggestions: []
      };

      expect(validationData.isValid).toBe(false);
      expect(validationData.errors).toHaveLength(1);
      expect(validationData.warnings).toEqual([]);
      expect(validationData.suggestions).toEqual([]);
    });

    it('should handle only warnings', () => {
      const validationData: ProductValidationDto = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: 'description',
            code: 'TOO_SHORT',
            message: 'Description should be longer for better SEO'
          }
        ],
        suggestions: []
      };

      expect(validationData.isValid).toBe(true);
      expect(validationData.errors).toEqual([]);
      expect(validationData.warnings).toHaveLength(1);
      expect(validationData.suggestions).toEqual([]);
    });

    it('should handle only suggestions', () => {
      const validationData: ProductValidationDto = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [
          {
            field: 'images',
            type: 'improvement',
            message: 'Add more product images for better conversion',
            impact: 'medium'
          }
        ]
      };

      expect(validationData.isValid).toBe(true);
      expect(validationData.errors).toEqual([]);
      expect(validationData.warnings).toEqual([]);
      expect(validationData.suggestions).toHaveLength(1);
    });
  });
});
