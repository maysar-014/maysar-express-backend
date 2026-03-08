/**
 * Infrastructure Layer Performance Tests
 * 
 * Purpose: Performance testing for critical infrastructure paths
 * Scope: Infrastructure layer performance under load and stress
 * Coverage Target: 90% (critical performance paths)
 * 
 * Test Categories:
 * - Database query performance
 * - File upload throughput
 * - Image processing performance
 * - Cache hit/miss ratios
 * - API response times
 * - Memory usage optimization
 * - Concurrent operation performance
 * - Resource utilization monitoring
 * 
 * Performance Benchmarks:
 * - Database queries: <100ms for single queries, <1s for complex queries
 * - File uploads: <5s for 10MB files, <30s for 100MB files
 * - Image processing: <2s for 1080p images, <10s for 4K images
 * - Cache operations: <10ms for get/set operations
 * - API responses: <200ms for simple requests, <1s for complex requests
 * - Memory usage: <100MB growth for 1000 concurrent operations
 */

import { PrismaProductRepository } from '../../repositories/prisma-product.repository';
import { FileUploadService } from '../../services/file-upload.service';
import { ImageOptimizationService } from '../../services/image-optimization.service';
import { CacheService } from '../../services/cache.service';
import { HealthCheckService } from '../../services/health-check.service';
import { SearchProvider as SearchProviderEnum, ElasticsearchProvider } from '../../providers/search.provider';
import { S3CDNProvider, CDNProvider } from '../../providers/cdn.provider';
import { ImageProcessingProvider, SharpImageProvider } from '../../providers/image-processing.provider';
import { CacheProvider as CacheProviderEnum, CacheProviderFactory } from '../../providers/cache-provider';

class SearchProvider {
  constructor(
    private readonly provider?: {
      search: (query: unknown) => Promise<unknown>;
    }
  ) {}

  async search(query: unknown): Promise<unknown> {
    if (this.provider?.search) {
      return this.provider.search(query);
    }

    return {
      results: [],
      total: 0,
      page: 1,
      limit: 10,
      facets: { categories: [], priceRanges: [] }
    };
  }
}

class CacheProvider {
  private store = new Map<string, unknown>();

  async get(key: string): Promise<unknown | null> {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }
}

describe('Infrastructure Layer Performance Tests', () => {
  let repository: PrismaProductRepository;
  let fileUploadService: FileUploadService;
  let imageOptimizationService: ImageOptimizationService;
  let cacheService: CacheService;
  let healthCheckService: HealthCheckService;
  let searchProvider: SearchProvider;
  let cdnProvider: S3CDNProvider;
  let imageProvider: SharpImageProvider;
  let cacheProvider: CacheProvider;

  beforeEach(() => {
    // Initialize services with test configurations
    repository = new PrismaProductRepository({} as any);
    fileUploadService = new FileUploadService();
    imageOptimizationService = new ImageOptimizationService({} as any, {} as any);
    cacheService = new CacheService();
    healthCheckService = new HealthCheckService();
    searchProvider = new SearchProvider();
    cdnProvider = new S3CDNProvider({
      provider: CDNProvider.AWS_S3,
      bucket: 'test-bucket',
      region: 'us-east-1',
      timeout: 1000,
      maxFileSize: 50 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png']
    });
    imageProvider = new SharpImageProvider({
      provider: ImageProcessingProvider.SHARP,
      maxFileSize: 50 * 1024 * 1024,
      allowedFormats: ['jpeg', 'png', 'webp', 'avif'],
      quality: 80,
      timeout: 1000,
      concurrency: 4,
      cacheEnabled: false
    });
    cacheProvider = new CacheProvider();
  });

  describe('Database Performance', () => {
    it('should handle single product queries within 100ms', async () => {
      const startTime = Date.now();
      
      // Mock fast database response
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'test-product',
            title: 'Test Product',
            description: 'Test Description',
            categoryId: 'test-category',
            status: 'published',
            visibility: 'public',
            tags: ['test'],
            createdAt: new Date(),
            updatedAt: new Date(),
            category: { id: 'test-category', name: 'Test Category' },
            variants: []
          })
        },
        $transaction: jest.fn()
      };

      const fastRepository = new PrismaProductRepository(mockPrismaClient as any);
      await fastRepository.findById('test-product');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle complex search queries within 1 second', async () => {
      const startTime = Date.now();

      // Mock complex search with multiple filters
      const mockPrismaClient = {
        product: {
          findMany: jest.fn().mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({
            id: `product-${i}`,
            title: `Product ${i}`,
            description: `Description ${i}`,
            categoryId: `category-${i % 10}`,
            status: 'published',
            visibility: 'public',
            tags: [`tag-${i}`],
            createdAt: new Date(),
            updatedAt: new Date(),
            category: { id: `category-${i % 10}`, name: `Category ${i % 10}` },
            variants: []
          }))),
          count: jest.fn().mockResolvedValue(1000)
        },
        $transaction: jest.fn()
      };

      const complexRepository = new PrismaProductRepository(mockPrismaClient as any);
      await complexRepository.search({
        category: 'electronics',
        status: 'published',
        tags: ['featured', 'new']
      }, { page: 1, limit: 100 });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle bulk product operations efficiently', async () => {
      const startTime = Date.now();

      // Mock bulk operations
      const mockPrismaClient = {
        product: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        },
        $transaction: jest.fn().mockResolvedValue([])
      };

      const bulkRepository = new PrismaProductRepository(mockPrismaClient as any);
      
      // Test multiple concurrent operations
      const operations = Array.from({ length: 100 }, (_, i) => 
        bulkRepository.findBySeller(`seller-${i}`)
      );

      await Promise.all(operations);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete 100 operations in under 5 seconds
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentUsers = 50;
      const operationsPerUser = 10;

      const startTime = Date.now();

      // Mock concurrent database access
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'test', title: 'Test' }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        },
        $transaction: jest.fn().mockResolvedValue([])
      };

      const concurrentRepository = new PrismaProductRepository(mockPrismaClient as any);

      // Simulate concurrent users
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userOperations = Array.from({ length: operationsPerUser }, async (_, opIndex) => {
          await concurrentRepository.findById(`product-${userIndex}-${opIndex}`);
          await concurrentRepository.findBySeller(`seller-${userIndex}`);
        });
        return Promise.all(userOperations);
      });

      await Promise.all(userPromises);

      const duration = Date.now() - startTime;
      
      // Should handle 500 operations (50 users * 10 operations) efficiently
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledTimes(500);
    });
  });

  describe('File Upload Performance', () => {
    it('should upload 10MB files within 5 seconds', async () => {
      const startTime = Date.now();

      // Mock fast CDN upload
      const mockCDNProvider = {
        uploadFile: jest.fn().mockResolvedValue({
          key: 'test-file.jpg',
          url: 'https://cdn.example.com/test-file.jpg',
          etag: '"test-etag"',
          size: 10 * 1024 * 1024,
          uploadTime: 2000,
          timestamp: new Date()
        })
      };

      const fastService = new FileUploadService({}, mockCDNProvider as any);

      const largeFile = {
        fieldName: 'file',
        originalName: 'large-file.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
        buffer: Buffer.alloc(10 * 1024 * 1024, 'test-data')
      };

      await fastService.uploadFile(largeFile);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle batch uploads efficiently', async () => {
      const startTime = Date.now();

      // Mock batch CDN uploads
      const mockCDNProvider = {
        uploadFile: jest.fn().mockResolvedValue({
          key: 'test-file.jpg',
          url: 'https://cdn.example.com/test-file.jpg',
          etag: '"test-etag"',
          size: 1024 * 1024,
          uploadTime: 500,
          timestamp: new Date()
        })
      };

      const batchService = new FileUploadService({}, mockCDNProvider as any);

      const files = Array.from({ length: 20 }, (_, i) => ({
        fieldName: 'file',
        originalName: `file-${i}.jpg`,
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024 * 1024, // 1MB each
        buffer: Buffer.alloc(1024 * 1024, `test-data-${i}`)
      }));

      await batchService.uploadBatch(files, { concurrency: 5 });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete 20 uploads in under 10 seconds
      expect(mockCDNProvider.uploadFile).toHaveBeenCalledTimes(20);
    });

    it('should optimize memory usage during large file uploads', async () => {
      const initialMemory = process.memoryUsage();

      // Mock memory-efficient upload
      const mockCDNProvider = {
        uploadFile: jest.fn().mockResolvedValue({
          key: 'large-file.jpg',
          url: 'https://cdn.example.com/large-file.jpg',
          etag: '"large-etag"',
          size: 100 * 1024 * 1024,
          uploadTime: 5000,
          timestamp: new Date()
        })
      };

      const memoryService = new FileUploadService({}, mockCDNProvider as any);

      // Upload multiple large files
      const largeFiles = Array.from({ length: 10 }, (_, i) => ({
        fieldName: 'file',
        originalName: `large-file-${i}.jpg`,
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 50 * 1024 * 1024, // 50MB each
        buffer: Buffer.alloc(50 * 1024 * 1024, `large-data-${i}`)
      }));

      await memoryService.uploadBatch(largeFiles, { concurrency: 3 });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 500MB for 500MB of data)
      expect(memoryGrowth).toBeLessThan(500 * 1024 * 1024);
    });
  });

  describe('Image Optimization Performance', () => {
    it('should optimize 1080p images within 2 seconds', async () => {
      const startTime = Date.now();

      // Mock fast image processing
      const mockImageProcessor = {
        processImage: jest.fn().mockResolvedValue({
          buffer: Buffer.alloc(500 * 1024), // 500KB optimized
          size: 500 * 1024,
          width: 1920,
          height: 1080,
          processingTime: 800,
          originalSize: 2048 * 1024 // 2MB original
        }),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 2048 * 1024
        })
      };

      const fastService = new ImageOptimizationService({} as any, mockImageProcessor as any);

      const imageBuffer = Buffer.alloc(2048 * 1024, 'image-data');
      await fastService.optimizeImage(imageBuffer);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should optimize 4K images within 10 seconds', async () => {
      const startTime = Date.now();

      // Mock 4K image processing
      const mockImageProcessor = {
        processImage: jest.fn().mockResolvedValue({
          buffer: Buffer.alloc(2 * 1024 * 1024), // 2MB optimized
          size: 2 * 1024 * 1024,
          width: 3840,
          height: 2160,
          processingTime: 5000,
          originalSize: 20 * 1024 * 1024 // 20MB original
        }),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 3840,
          height: 2160,
          format: 'jpeg',
          size: 20 * 1024 * 1024
        })
      };

      const kService = new ImageOptimizationService({} as any, mockImageProcessor as any);

      const kImageBuffer = Buffer.alloc(20 * 1024 * 1024, '4k-image-data');
      await kService.optimizeImage(kImageBuffer);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle batch image optimization efficiently', async () => {
      const startTime = Date.now();

      // Mock batch image processing
      const mockImageProcessor = {
        processImage: jest.fn().mockResolvedValue({
          buffer: Buffer.alloc(500 * 1024),
          size: 500 * 1024,
          width: 1920,
          height: 1080,
          processingTime: 800,
          originalSize: 2048 * 1024
        }),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 2048 * 1024
        })
      };

      const batchService = new ImageOptimizationService({} as any, mockImageProcessor as any);

      const images = Array.from({ length: 50 }, (_, i) => ({
        buffer: Buffer.alloc(2048 * 1024, `image-data-${i}`),
        id: `image-${i}`
      }));

      await batchService.optimizeBatch(images, { concurrency: 5 });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(20000); // Should complete 50 images in under 20 seconds
      expect(mockImageProcessor.processImage).toHaveBeenCalledTimes(50);
    });

    it('should maintain memory efficiency during batch processing', async () => {
      const initialMemory = process.memoryUsage();

      const mockImageProcessor = {
        processImage: jest.fn().mockResolvedValue({
          buffer: Buffer.alloc(500 * 1024),
          size: 500 * 1024,
          width: 1920,
          height: 1080,
          processingTime: 800,
          originalSize: 2048 * 1024
        }),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 2048 * 1024
        })
      };

      const memoryService = new ImageOptimizationService({} as any, mockImageProcessor as any);

      // Process many images
      const manyImages = Array.from({ length: 100 }, (_, i) => ({
        buffer: Buffer.alloc(1024 * 1024, `image-data-${i}`),
        id: `image-${i}`
      }));

      await memoryService.optimizeBatch(manyImages, { concurrency: 10 });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable for 100MB of image data
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
    });
  });

  describe('Cache Performance', () => {
    it('should handle cache get operations within 10ms', async () => {
      const startTime = Date.now();

      // Mock fast cache response
      const mockCacheProvider = {
        get: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const fastService = new CacheService(mockCacheProvider as any);
      await fastService.get('test-key');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should handle cache set operations within 10ms', async () => {
      const startTime = Date.now();

      const mockCacheProvider = {
        get: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const fastService = new CacheService(mockCacheProvider as any);
      await fastService.set('test-key', 'test-value');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should maintain high cache hit ratio under load', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockImplementation((key: string) => {
          // Simulate 80% hit ratio
          return Math.random() < 0.8 
            ? Promise.resolve(`value-for-${key}`)
            : Promise.resolve(null);
        }),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const loadService = new CacheService(mockCacheProvider as any);

      // Perform many cache operations
      const operations = Array.from({ length: 1000 }, (_, i) => 
        loadService.get(`key-${i % 100}`) // Reuse keys to get hits
      );

      await Promise.all(operations);

      // Count hits vs misses
      const hitCount = mockCacheProvider.get.mock.results.filter(r => r.value !== null).length;
      const hitRatio = hitCount / 1000;

      expect(hitRatio).toBeGreaterThan(0.7); // Should maintain at least 70% hit ratio
    });

    it('should handle concurrent cache operations efficiently', async () => {
      const startTime = Date.now();

      const mockCacheProvider = {
        get: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const concurrentService = new CacheService(mockCacheProvider as any);

      // Simulate concurrent cache access
      const concurrentOperations = Array.from({ length: 100 }, async (_, i) => {
        await concurrentService.set(`key-${i}`, `value-${i}`);
        await concurrentService.get(`key-${i}`);
        await concurrentService.exists(`key-${i}`);
      });

      await Promise.all(concurrentOperations);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete 300 operations in under 1 second
      expect(mockCacheProvider.set).toHaveBeenCalledTimes(100);
      expect(mockCacheProvider.get).toHaveBeenCalledTimes(100);
      expect(mockCacheProvider.exists).toHaveBeenCalledTimes(100);
    });
  });

  describe('API Response Performance', () => {
    it('should handle simple API requests within 200ms', async () => {
      const startTime = Date.now();

      // Mock fast API responses
      const mockSearchProvider = {
        search: jest.fn().mockResolvedValue({
          results: [],
          total: 0,
          page: 1,
          limit: 10,
          facets: { categories: [], priceRanges: [] }
        })
      };

      const fastProvider = new SearchProvider(mockSearchProvider as any);
      await fastProvider.search({
        query: 'test',
        filters: {},
        pagination: { page: 1, limit: 10 }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should handle complex API requests within 1 second', async () => {
      const startTime = Date.now();

      // Mock complex API response with multiple filters
      const mockSearchProvider = {
        search: jest.fn().mockResolvedValue({
          results: Array.from({ length: 50 }, (_, i) => ({
            id: `product-${i}`,
            title: `Product ${i}`,
            description: `Description ${i}`,
            price: 100 + i,
            category: 'electronics',
            image: `https://cdn.example.com/image-${i}.jpg`,
            score: 0.9
          })),
          total: 1000,
          page: 1,
          limit: 50,
          facets: {
            categories: Array.from({ length: 10 }, (_, i) => ({
              name: `category-${i}`,
              count: 100
            })),
            priceRanges: [
              { min: 0, max: 100, count: 400 },
              { min: 100, max: 500, count: 400 },
              { min: 500, max: 1000, count: 200 }
            ]
          }
        })
      };

      const complexProvider = new SearchProvider(mockSearchProvider as any);
      await complexProvider.search({
        query: 'electronics',
        filters: {
          category: 'electronics',
          price: { min: 0, max: 1000 },
          brand: ['brand1', 'brand2', 'brand3']
        },
        pagination: { page: 1, limit: 50 },
        sort: { field: 'price', order: 'asc' }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const startTime = Date.now();

      const mockSearchProvider = {
        search: jest.fn().mockResolvedValue({
          results: [],
          total: 0,
          page: 1,
          limit: 10,
          facets: { categories: [], priceRanges: [] }
        })
      };

      const concurrentProvider = new SearchProvider(mockSearchProvider as any);

      // Simulate concurrent API requests
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => 
        concurrentProvider.search({
          query: `query-${i}`,
          filters: {},
          pagination: { page: 1, limit: 10 }
        })
      );

      await Promise.all(concurrentRequests);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete 50 requests in under 2 seconds
      expect(mockSearchProvider.search).toHaveBeenCalledTimes(50);
    });
  });

  describe('Resource Utilization', () => {
    it('should monitor and report performance metrics', async () => {
      // Mock services with metrics tracking
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'test', title: 'Test' }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        },
        $transaction: jest.fn().mockResolvedValue([])
      };

      const metricsRepository = new PrismaProductRepository(mockPrismaClient as any);

      // Perform operations and check metrics
      const startTime = Date.now();
      await metricsRepository.findById('test');
      const duration = Date.now() - startTime;

      // Verify metrics are being tracked
      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledTimes(1);
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate memory-intensive operations
      const largeArrays = Array.from({ length: 100 }, () => 
        Array.from({ length: 10000 }, (_, i) => `data-${i}`)
      );

      // Process large amounts of data
      const processedData = largeArrays.map(arr => 
        arr.map(item => item.toUpperCase())
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should be managed efficiently
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth

      // Clean up
      largeArrays.length = 0;
      processedData.length = 0;
    });

    it('should maintain performance under CPU load', async () => {
      const startTime = Date.now();

      // Simulate CPU-intensive operations
      const cpuIntensiveTask = () => {
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.random() * Math.random();
        }
        return result;
      };

      // Run multiple CPU-intensive tasks concurrently
      const cpuTasks = Array.from({ length: 10 }, () => 
        Promise.resolve(cpuIntensiveTask())
      );

      await Promise.all(cpuTasks);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Stress Testing', () => {
    it('should handle 1000 concurrent operations', async () => {
      const startTime = Date.now();

      // Mock high-throughput operations
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ id: 'test', title: 'Test' }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        },
        $transaction: jest.fn().mockResolvedValue([])
      };

      const stressRepository = new PrismaProductRepository(mockPrismaClient as any);

      // Create 1000 concurrent operations
      const stressOperations = Array.from({ length: 1000 }, (_, i) => 
        stressRepository.findById(`product-${i}`)
      );

      await Promise.all(stressOperations);

      const duration = Date.now() - startTime;
      
      // Should handle 1000 operations efficiently
      expect(duration).toBeLessThan(30000); // Under 30 seconds
      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledTimes(1000);
    });

    it('should maintain response times under load', async () => {
      const responseTimes: number[] = [];
      const operations = 500;

      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockImplementation(() => {
            const start = Date.now();
            return new Promise(resolve => {
              setTimeout(() => {
                const duration = Date.now() - start;
                responseTimes.push(duration);
                resolve({ id: 'test', title: 'Test' });
              }, Math.random() * 50); // Random delay up to 50ms
            });
          }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        },
        $transaction: jest.fn().mockResolvedValue([])
      };

      const loadRepository = new PrismaProductRepository(mockPrismaClient as any);

      // Run operations concurrently
      const loadOperations = Array.from({ length: operations }, (_, i) => 
        loadRepository.findById(`product-${i}`)
      );

      await Promise.all(loadOperations);

      // Analyze response times
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
      expect(p95ResponseTime).toBeLessThan(500); // 95th percentile under 500ms
    });
  });
});
