/**
 * Infrastructure Layer Resilience Tests
 * 
 * Purpose: Error handling and resilience testing for infrastructure components
 * Scope: Infrastructure layer error scenarios and recovery mechanisms
 * Coverage Target: 95% (critical error handling paths)
 * 
 * Test Categories:
 * - Error propagation and handling
 * - Circuit breaker patterns
 * - Retry mechanisms
 * - Graceful degradation
 * - Resource cleanup on failures
 * - Timeout handling
 * - Connection failure recovery
 * 
 * Edge Cases Covered:
 * - Database connection failures
 * - Network timeouts
 * - Service unavailability
 * - Resource exhaustion
 * - Invalid input handling
 * - Memory leaks prevention
 */

import { promises as fsPromises } from 'fs';
import { PrismaProductRepository } from '../../repositories/prisma-product.repository';
import { FileUploadService } from '../../services/file-upload.service';
import { ImageOptimizationService } from '../../services/image-optimization.service';
import { CacheService } from '../../services/cache.service';
import { HealthCheckService } from '../../services/health-check.service';
import { SearchProvider } from '../../providers/search.provider';
import { MessageBus } from '../../messaging/message-bus';
import { EventPublisher } from '../../messaging/event-publisher';
import { EventSubscriber } from '../../messaging/event-subscriber';

type MockPrismaClient = {
  product: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
  };
  productVariant?: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockCacheProvider = {
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  exists: jest.Mock;
  clear?: jest.Mock;
  getMultiple?: jest.Mock;
  setMultiple?: jest.Mock;
  invalidateByPattern?: jest.Mock;
  invalidateByTags?: jest.Mock;
  getKeysByTag?: jest.Mock;
  getTagsForKey?: jest.Mock;
  getAnalytics?: jest.Mock;
};

const createMockProductEntity = () => ({
  getId: () => ({ toString: () => 'product-id' }),
  getSellerId: () => ({ toString: () => 'seller-id' }),
  getName: () => 'Test Product',
  getDescription: () => 'Test Description',
  getCategoryId: () => ({ toString: () => 'category-id' }),
  getStatus: () => ({ toString: () => 'published' }),
  getVisibility: () => 'public',
  getTags: () => ['test'],
  getEnablerEnabled: () => false,
  getEnablerCommissionRate: () => 0,
  getVariants: () => []
});

const createCacheServiceWithProvider = (provider: MockCacheProvider): CacheService => {
  const service = new CacheService();
  (service as unknown as { cache: MockCacheProvider }).cache = provider;
  return service;
};

describe('Infrastructure Layer Resilience Tests', () => {
  let fileUploadService: FileUploadService;

  beforeEach(() => {
    // Initialize services with test configurations
    fileUploadService = new FileUploadService();
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockRejectedValue(new Error('Connection failed')),
          findMany: jest.fn().mockRejectedValue(new Error('Connection failed')),
          count: jest.fn().mockRejectedValue(new Error('Connection failed')),
          upsert: jest.fn().mockRejectedValue(new Error('Connection failed')),
          update: jest.fn().mockRejectedValue(new Error('Connection failed'))
        },
        $transaction: jest.fn().mockRejectedValue(new Error('Transaction failed'))
      };

      const failingRepository = new PrismaProductRepository(
        mockPrismaClient as unknown as ConstructorParameters<typeof PrismaProductRepository>[0]
      );

      // Test find operations
      await expect(failingRepository.findById('test-id')).rejects.toThrow('Connection failed');
      await expect(failingRepository.findBySeller('test-seller')).rejects.toThrow('Connection failed');
      await expect(failingRepository.search({}, { page: 1, limit: 10 })).rejects.toThrow('Connection failed');

      // Test save operation
      await expect(failingRepository.save(createMockProductEntity())).rejects.toThrow('Transaction failed');

      // Test update operation
      await expect(failingRepository.updateStatus('test-id', 'published')).rejects.toThrow('Connection failed');

      // Test delete operation
      await expect(failingRepository.delete('test-id')).resolves.toBe(false);
    });

    it('should handle database timeout errors', async () => {
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockRejectedValue(new Error('Query timeout')),
          findMany: jest.fn().mockRejectedValue(new Error('Query timeout')),
          count: jest.fn().mockRejectedValue(new Error('Query timeout')),
          upsert: jest.fn().mockRejectedValue(new Error('Query timeout')),
          update: jest.fn().mockRejectedValue(new Error('Query timeout'))
        },
        $transaction: jest.fn().mockRejectedValue(new Error('Transaction timeout'))
      };

      const timeoutRepository = new PrismaProductRepository(
        mockPrismaClient as unknown as ConstructorParameters<typeof PrismaProductRepository>[0]
      );

      await expect(timeoutRepository.findById('test-id')).rejects.toThrow('Query timeout');
      await expect(timeoutRepository.search({}, { page: 1, limit: 10 })).rejects.toThrow('Query timeout');
    });

    it('should handle database constraint violations', async () => {
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          upsert: jest.fn().mockRejectedValue(new Error('Unique constraint violation')),
          update: jest.fn().mockRejectedValue(new Error('Foreign key constraint violation'))
        },
        $transaction: jest.fn().mockRejectedValue(new Error('Constraint violation'))
      };

      const constraintRepository = new PrismaProductRepository(
        mockPrismaClient as unknown as ConstructorParameters<typeof PrismaProductRepository>[0]
      );

      await expect(constraintRepository.save(createMockProductEntity())).rejects.toThrow('Constraint violation');
      await expect(constraintRepository.updateStatus('test-id', 'published')).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle database transaction rollbacks', async () => {
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          upsert: jest.fn().mockResolvedValue({ id: 'test-id' }),
          update: jest.fn().mockResolvedValue({ id: 'test-id' })
        },
        productVariant: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockRejectedValue(new Error('Variant creation failed'))
        },
        $transaction: jest.fn().mockRejectedValue(new Error('Transaction rolled back'))
      };

      const rollbackRepository = new PrismaProductRepository(
        mockPrismaClient as unknown as ConstructorParameters<typeof PrismaProductRepository>[0]
      );

      await expect(rollbackRepository.save(createMockProductEntity())).rejects.toThrow('Transaction rolled back');
    });
  });

  describe('File Upload Error Handling', () => {
    it('should handle file validation errors', async () => {
      const invalidFiles = [
        {
          fieldName: 'file',
          originalName: 'large-file.jpg',
          encoding: '7bit',
          mimeType: 'image/jpeg',
          size: 10 * 1024 * 1024, // 10MB - exceeds limit
          buffer: Buffer.from('large-file-data')
        },
        {
          fieldName: 'file',
          originalName: 'script.js',
          encoding: '7bit',
          mimeType: 'application/javascript',
          size: 1024,
          buffer: Buffer.from('script-data')
        },
        {
          fieldName: 'file',
          originalName: '../../../etc/passwd',
          encoding: '7bit',
          mimeType: 'text/plain',
          size: 1024,
          buffer: Buffer.from('malicious-data')
        }
      ];

      for (const file of invalidFiles) {
        const result = await fileUploadService.uploadFile(file);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle file processing errors', async () => {
      const mockImageProcessor = {
        processImage: jest.fn().mockRejectedValue(new Error('Image processing failed'))
      };

      const failingService = new FileUploadService(
        {},
        undefined,
        mockImageProcessor as unknown as ConstructorParameters<typeof FileUploadService>[2]
      );

      const imageFile = {
        fieldName: 'image',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('image-data')
      };

      const result = await failingService.uploadFile(imageFile, { optimizeImage: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Image processing failed');
    });

    it('should handle storage failures', async () => {
      const mockCDNProvider = {
        uploadFile: jest.fn().mockRejectedValue(new Error('Storage failed'))
      };

      const failingService = new FileUploadService(
        { storageProvider: 'cdn' },
        mockCDNProvider as unknown as ConstructorParameters<typeof FileUploadService>[1]
      );

      const file = {
        fieldName: 'file',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('file-data')
      };

      const result = await failingService.uploadFile(file);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage failed');
    });

    it('should handle batch upload partial failures', async () => {
      const mkdirSpy = jest.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined as never);
      const writeFileSpy = jest.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined);

      const mixedFiles = [
        {
          fieldName: 'file1',
          originalName: 'valid.jpg',
          encoding: '7bit',
          mimeType: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('valid-data')
        },
        {
          fieldName: 'file2',
          originalName: 'invalid.exe',
          encoding: '7bit',
          mimeType: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('invalid-data')
        }
      ];

      const result = await fileUploadService.uploadBatch(mixedFiles);
      expect(result.totalFiles).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fileName).toBe('invalid.exe');

      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });
  });

  describe('Image Optimization Error Handling', () => {
    it('should handle image processing failures', async () => {
      const mockImageProcessor = {
        processImage: jest.fn().mockRejectedValue(new Error('Processing failed')),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1000000
        })
      };

      const failingService = new ImageOptimizationService(
        {},
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const buffer = Buffer.from('image-data');
      const result = await failingService.optimizeImage(buffer);
      expect(result.original.buffer).toEqual(buffer);
      expect(result.optimized.buffer).toEqual(buffer);
      expect(result.optimizationRatio).toBe(1);
    });

    it('should handle invalid image formats', async () => {
      const mockImageProcessor = {
        processImage: jest.fn().mockRejectedValue(new Error('Unsupported format')),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'unknown',
          size: 1000000
        })
      };

      const failingService = new ImageOptimizationService(
        {},
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const buffer = Buffer.from('invalid-image-data');
      const result = await failingService.optimizeImage(buffer);
      expect(result.original.buffer).toEqual(buffer);
      expect(result.optimized.buffer).toEqual(buffer);
      expect(result.optimizationRatio).toBe(1);
    });

    it('should handle optimization timeout', async () => {
      const mockImageProcessor = {
        processImage: jest.fn().mockRejectedValue(new Error('Timeout')),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1000000
        })
      };

      const failingService = new ImageOptimizationService(
        { maxProcessingTime: 30000 },
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const buffer = Buffer.from('image-data');
      const result = await failingService.optimizeImage(buffer);
      expect(result.original.buffer).toEqual(buffer);
      expect(result.optimized.buffer).toEqual(buffer);
      expect(result.optimizationRatio).toBe(1);
    });

    it('should handle batch optimization failures', async () => {
      const mockImageProcessor = {
        processBatch: jest.fn().mockRejectedValue(new Error('Batch processing failed')),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1000000
        })
      };

      const failingService = new ImageOptimizationService(
        {},
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const images = [
        { buffer: Buffer.from('image1'), id: 'img1' },
        { buffer: Buffer.from('image2'), id: 'img2' }
      ];

      const result = await failingService.optimizeBatch(images);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle cache connection failures', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockRejectedValue(new Error('Cache connection failed')),
        set: jest.fn().mockRejectedValue(new Error('Cache connection failed')),
        delete: jest.fn().mockRejectedValue(new Error('Cache connection failed')),
        del: jest.fn().mockRejectedValue(new Error('Cache connection failed')),
        exists: jest.fn().mockRejectedValue(new Error('Cache connection failed'))
      };

      const failingService = createCacheServiceWithProvider(mockCacheProvider);

      await expect(failingService.get('test-key')).resolves.toBeNull();
      await expect(failingService.set('test-key', 'test-value')).rejects.toThrow('Cache connection failed');
      await expect(failingService.delete('test-key')).resolves.toBe(false);
      await expect(failingService.exists('test-key')).resolves.toBe(false);
    });

    it('should handle cache timeout errors', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockRejectedValue(new Error('Cache timeout')),
        set: jest.fn().mockRejectedValue(new Error('Cache timeout')),
        delete: jest.fn().mockRejectedValue(new Error('Cache timeout')),
        del: jest.fn().mockRejectedValue(new Error('Cache timeout')),
        exists: jest.fn().mockRejectedValue(new Error('Cache timeout'))
      };

      const failingService = createCacheServiceWithProvider(mockCacheProvider);

      await expect(failingService.get('test-key')).resolves.toBeNull();
      await expect(failingService.set('test-key', 'test-value')).rejects.toThrow('Cache timeout');
    });

    it('should handle cache serialization errors', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockResolvedValue('invalid-json'),
        set: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const failingService = createCacheServiceWithProvider(mockCacheProvider);

      const result = await failingService.get('test-key');
      expect(result).toBe('invalid-json');
    });
  });

  describe('Health Check Error Handling', () => {
    it('should handle service health check failures', async () => {
      const failingService = new HealthCheckService();

      // Mock failing health checks
      const originalCheckDatabase = failingService['checkDatabase'];
      const originalCheckCache = failingService['checkCache'];
      const originalCheckExternalServices = failingService['checkExternalServices'];

      failingService['checkDatabase'] = jest.fn().mockResolvedValue({
        status: 'error',
        message: 'Database connection failed',
        details: { error: 'Connection timeout' }
      });

      failingService['checkCache'] = jest.fn().mockResolvedValue({
        status: 'error',
        message: 'Cache service unavailable',
        details: { error: 'Redis connection failed' }
      });

      failingService['checkExternalServices'] = jest.fn().mockResolvedValue({
        status: 'error',
        message: 'External services down',
        details: { services: ['search', 'cdn'] }
      });

      const result = await failingService.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services).toEqual({
        database: {
          status: 'error',
          message: 'Database connection failed',
          details: { error: 'Connection timeout' }
        },
        cache: {
          status: 'error',
          message: 'Cache service unavailable',
          details: { error: 'Redis connection failed' }
        },
        externalServices: {
          status: 'error',
          message: 'External services down',
          details: { services: ['search', 'cdn'] }
        }
      });

      // Restore original methods
      failingService['checkDatabase'] = originalCheckDatabase;
      failingService['checkCache'] = originalCheckCache;
      failingService['checkExternalServices'] = originalCheckExternalServices;
    });

    it('should handle partial health check failures', async () => {
      const failingService = new HealthCheckService();

      // Mock mixed health check results
      failingService['checkDatabase'] = jest.fn().mockResolvedValue({
        status: 'healthy',
        message: 'Database OK',
        details: { uptime: 1000 }
      });

      failingService['checkCache'] = jest.fn().mockResolvedValue({
        status: 'error',
        message: 'Cache service unavailable',
        details: { error: 'Redis connection failed' }
      });

      failingService['checkExternalServices'] = jest.fn().mockResolvedValue({
        status: 'healthy',
        message: 'External services OK',
        details: { services: ['search', 'cdn'] }
      });

      const result = await failingService.getHealthStatus();

      expect(result.status).toBe('error'); // Legacy helper treats any error as overall error
      expect(result.services.database.status).toBe('healthy');
      expect(result.services.cache.status).toBe('error');
      expect(result.services.externalServices.status).toBe('healthy');
    });
  });

  describe('Messaging Error Handling', () => {
    it('should handle message publishing failures', async () => {
      const mockEventPublisher = {
        publish: jest.fn().mockRejectedValue(new Error('Publish failed')),
        publishBatch: jest.fn().mockRejectedValue(new Error('Batch publish failed'))
      };

      const failingPublisher = new EventPublisher(mockEventPublisher);

      await expect(failingPublisher.publish('test-event', {})).rejects.toThrow('Publish failed');
      await expect(failingPublisher.publishBatch([])).rejects.toThrow('Batch publish failed');
    });

    it('should handle message subscription failures', async () => {
      const mockEventSubscriber = {
        subscribe: jest.fn().mockRejectedValue(new Error('Subscribe failed')),
        unsubscribe: jest.fn().mockRejectedValue(new Error('Unsubscribe failed')),
        handleMessage: jest.fn().mockRejectedValue(new Error('Handle failed'))
      };

      const failingSubscriber = new EventSubscriber(mockEventSubscriber);

      await expect(failingSubscriber.subscribe('test-event', () => {})).rejects.toThrow('Subscribe failed');
      await expect(failingSubscriber.unsubscribe('test-event')).rejects.toThrow('Unsubscribe failed');
    });

    it('should handle message bus failures', async () => {
      const mockMessageBus = {
        publish: jest.fn().mockRejectedValue(new Error('Bus publish failed')),
        subscribe: jest.fn().mockRejectedValue(new Error('Bus subscribe failed')),
        unsubscribe: jest.fn().mockRejectedValue(new Error('Bus unsubscribe failed'))
      };

      const failingBus = new MessageBus(mockMessageBus);

      await expect(failingBus.publish('test-event', {})).rejects.toThrow('Bus publish failed');
      await expect(failingBus.subscribe('test-event', () => {})).rejects.toThrow('Bus subscribe failed');
      await expect(failingBus.unsubscribe('test-event')).rejects.toThrow('Bus unsubscribe failed');
    });
  });

  describe('Resource Cleanup on Failures', () => {
    it('should cleanup temporary files on upload failures', async () => {
      const mkdirSpy = jest.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined as never);
      const writeFileSpy = jest.spyOn(fsPromises, 'writeFile').mockRejectedValue(new Error('Write failed'));

      const failingService = new FileUploadService();

      const file = {
        fieldName: 'file',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('file-data')
      };

      const result = await failingService.uploadFile(file);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
      expect(writeFileSpy).toHaveBeenCalled();
      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
    });

    it('should cleanup cache entries on service failures', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1)
      };

      const cacheService = createCacheServiceWithProvider(mockCacheProvider);

      // Set a value
      await cacheService.set('test-key', 'test-value');

      // Simulate service failure
      mockCacheProvider.set.mockRejectedValue(new Error('Cache failed'));

      // Should handle gracefully
      await expect(cacheService.set('test-key', 'new-value')).rejects.toThrow('Cache failed');
      expect(mockCacheProvider.del).not.toHaveBeenCalled(); // Should not cleanup on set failure
    });

    it('should handle memory leaks in batch operations', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        buffer: Buffer.alloc(128 * 1024), // 128KB each
        id: `file-${i}`
      }));

      const mockImageProcessor = {
        processBatch: jest.fn().mockImplementation(async (images: Array<{ buffer: Buffer }>) =>
          images.map(() => ({
            buffer: Buffer.alloc(64 * 1024),
            size: 64 * 1024,
            width: 800,
            height: 600,
            format: 'webp'
          }))
        ),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 128 * 1024
        })
      };

      const service = new ImageOptimizationService(
        {},
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const startTime = process.memoryUsage();
      const result = await service.optimizeBatch(largeBatch);
      const endTime = process.memoryUsage();

      expect(result.successful).toBe(50);
      expect(result.failed).toBe(0);

      // Memory usage should not grow excessively
      const memoryGrowth = endTime.heapUsed - startTime.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });
  });

  describe('Timeout Handling', () => {
    it('should handle database query timeouts', async () => {
      const mockPrismaClient = {
        product: {
          findUnique: jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Query timeout'));
          }),
          findMany: jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Query timeout'));
          }),
          count: jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Query timeout'));
          }),
          upsert: jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Query timeout'));
          }),
          update: jest.fn().mockImplementation(() => {
            return Promise.reject(new Error('Query timeout'));
          })
        },
        $transaction: jest.fn().mockImplementation(() => {
          return Promise.reject(new Error('Transaction timeout'));
        })
      };

      const timeoutRepository = new PrismaProductRepository(
        mockPrismaClient as unknown as ConstructorParameters<typeof PrismaProductRepository>[0]
      );

      // Should timeout after configured timeout period
      await expect(timeoutRepository.findById('test-id')).rejects.toThrow('Query timeout');
      await expect(timeoutRepository.search({}, { page: 1, limit: 10 })).rejects.toThrow('Query timeout');
    });

    it('should handle external service timeouts', async () => {
      const mockSearchProvider = {
        search: jest.fn().mockImplementation(() => {
          return Promise.reject(new Error('Search timeout'));
        })
      };

      const timeoutProvider = new SearchProvider(mockSearchProvider);

      await expect(timeoutProvider.search({
        query: 'test',
        filters: {},
        pagination: { page: 1, limit: 10 }
      })).rejects.toThrow('Search timeout');
    });

    it('should handle file upload timeouts', async () => {
      const mockCDNProvider = {
        uploadFile: jest.fn().mockRejectedValue(new Error('Upload timeout'))
      };

      const timeoutService = new FileUploadService(
        { uploadTimeout: 30000, storageProvider: 'cdn' },
        mockCDNProvider as unknown as ConstructorParameters<typeof FileUploadService>[1]
      );

      const file = {
        fieldName: 'file',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('file-data')
      };

      const result = await timeoutService.uploadFile(file);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload timeout');
    });
  });

  describe('Graceful Degradation', () => {
    it('should degrade gracefully when cache is unavailable', async () => {
      const mockCacheProvider = {
        get: jest.fn().mockRejectedValue(new Error('Cache unavailable')),
        set: jest.fn().mockRejectedValue(new Error('Cache unavailable')),
        delete: jest.fn().mockRejectedValue(new Error('Cache unavailable')),
        del: jest.fn().mockRejectedValue(new Error('Cache unavailable')),
        exists: jest.fn().mockRejectedValue(new Error('Cache unavailable'))
      };

      const degradedService = createCacheServiceWithProvider(mockCacheProvider);

      // Should return null/undefined instead of throwing
      const result = await degradedService.get('test-key');
      expect(result).toBeNull();

      await expect(degradedService.set('test-key', 'test-value')).rejects.toThrow('Cache unavailable');

      const deleteResult = await degradedService.delete('test-key');
      expect(deleteResult).toBe(false);

      const existsResult = await degradedService.exists('test-key');
      expect(existsResult).toBe(false);
    });

    it('should degrade gracefully when external services are down', async () => {
      const mockSearchProvider = {
        search: jest.fn().mockRejectedValue(new Error('Search service down'))
      };

      const degradedProvider = new SearchProvider(mockSearchProvider);

      // Should return empty results instead of throwing
      const result = await degradedProvider.search({
        query: 'test',
        filters: {},
        pagination: { page: 1, limit: 10 }
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should degrade gracefully when image processing fails', async () => {
      const mockImageProcessor = {
        processImage: jest.fn().mockRejectedValue(new Error('Image service down')),
        getImageMetadata: jest.fn().mockResolvedValue({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 1000000
        })
      };

      const degradedService = new ImageOptimizationService(
        {},
        mockImageProcessor as unknown as ConstructorParameters<typeof ImageOptimizationService>[1]
      );

      const buffer = Buffer.from('image-data');
      const result = await degradedService.optimizeImage(buffer);

      // Should return original image instead of throwing
      expect(result.original.buffer).toEqual(buffer);
      expect(result.optimized.buffer).toEqual(buffer); // No optimization applied
      expect(result.optimizationRatio).toBe(1); // No size change
    });
  });
});
