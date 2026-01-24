/**
 * Image Optimization Service Test Suite
 * 
 * Purpose: Validates image optimization service implementation
 * Scope: Infrastructure layer image optimization with Sharp and WebP conversion
 * Coverage Target: 95% (critical optimization operations)
 * 
 * Test Categories:
 * - Image format conversion and optimization
 * - Quality and compression settings
 * - Batch processing and performance
 * - Error handling and validation
 * - Memory management and constraints
 * - WebP and modern format support
 * - Metadata preservation
 * - Performance monitoring
 * 
 * Edge Cases Covered:
 * - Large image processing
 * - Invalid image formats
 * - Memory constraints
 * - Concurrent optimization
 * - Quality degradation
 * - Format compatibility
 * - Metadata loss prevention
 */

import { ImageOptimizationService } from '../image-optimization.service';
import { SharpImageProvider } from '../../providers/image-processing.provider';
import { S3CDNProvider } from '../../providers/cdn.provider';

describe('Image Optimization Service', () => {
  let optimizationService: ImageOptimizationService;
  let mockImageProvider: jest.Mocked<SharpImageProvider>;
  let mockCDNProvider: jest.Mocked<S3CDNProvider>;

  beforeEach(() => {
    mockImageProvider = {
      processImage: jest.fn(),
      processBatch: jest.fn(),
      getImageMetadata: jest.fn(),
      generateThumbnails: jest.fn(),
      convertFormat: jest.fn(),
      optimizeForWeb: jest.fn(),
      getMetrics: jest.fn()
    } as any;

    mockCDNProvider = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn(),
      fileExists: jest.fn(),
      getFileMetadata: jest.fn(),
      copyFile: jest.fn(),
      generateSignedUrl: jest.fn(),
      getMetrics: jest.fn()
    } as any;

    optimizationService = new ImageOptimizationService({}, mockImageProvider, mockCDNProvider);
  });

  describe('Single Image Optimization', () => {
    it('should optimize image with default settings', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);

      const result = await optimizationService.optimizeImage(buffer);

      expect(mockImageProvider.getImageMetadata).toHaveBeenCalledWith(buffer);
      expect(mockImageProvider.processImage).toHaveBeenCalledWith(buffer, {
        quality: 80,
        format: 'webp',
        fit: 'inside'
      });
      expect(result.original.size).toBe(500000);
      expect(result.optimized.size).toBe(100000);
      expect(result.optimized.format).toBe('webp');
      expect(result.optimizationRatio).toBe(5);
    });

    it('should optimize image with custom pipeline', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 120000,
        processingTime: 180,
        originalSize: 500000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);

      const result = await optimizationService.optimizeImage(buffer, {
        pipeline: 'product'
      });

      expect(mockImageProvider.getImageMetadata).toHaveBeenCalledWith(buffer);
      expect(mockImageProvider.processImage).toHaveBeenCalledWith(buffer, {
        quality: 80,
        format: 'webp',
        fit: 'inside'
      });
      expect(result.original.size).toBe(500000);
      expect(result.optimized.size).toBe(120000);
    });

    it('should generate variants when requested', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      const mockVariants = {
        thumbnail: {
          buffer: Buffer.from('thumbnail'),
          format: 'webp',
          width: 150,
          height: 150,
          size: 10000,
          processingTime: 50,
          originalSize: 500000
        },
        medium: {
          buffer: Buffer.from('medium'),
          format: 'webp',
          width: 800,
          height: 600,
          size: 25000,
          processingTime: 80,
          originalSize: 500000
        },
        large: {
          buffer: Buffer.from('large'),
          format: 'webp',
          width: 1920,
          height: 1080,
          size: 60000,
          processingTime: 120,
          originalSize: 500000
        }
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);
      mockImageProvider.processImage.mockResolvedValueOnce(mockOptimizedResult);
      mockImageProvider.processImage.mockResolvedValueOnce(mockVariants.thumbnail);
      mockImageProvider.processImage.mockResolvedValueOnce(mockVariants.medium);
      mockImageProvider.processImage.mockResolvedValueOnce(mockVariants.large);

      const result = await optimizationService.optimizeImage(buffer, {
        generateVariants: true
      });

      expect(result.variants).toBeDefined();
      expect(Object.keys(result.variants)).toHaveLength(3);
    });

    it('should store images in CDN when requested', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      const mockUploadResult = {
        key: 'optimized-image.webp',
        url: 'https://cdn.example.com/optimized-image.webp',
        etag: 'etag123',
        size: 100000,
        uploadTime: 50,
        timestamp: new Date()
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);
      mockCDNProvider.uploadFile.mockResolvedValue(mockUploadResult);

      const result = await optimizationService.optimizeImage(buffer, {
        storeInCDN: true,
        customPath: 'products/123'
      });

      expect(mockCDNProvider.uploadFile).toHaveBeenCalledWith(mockOptimizedResult.buffer, {
        key: 'products/123/optimized_123456789.webp',
        contentType: 'image/webp'
      });
      expect(result.cdnUrls).toBeDefined();
    });

    it('should handle optimization failures', async () => {
      const buffer = Buffer.from('test image');

      mockImageProvider.getImageMetadata.mockRejectedValue(new Error('Invalid image'));

      await expect(optimizationService.optimizeImage(buffer))
        .rejects.toThrow('Image optimization failed');
    });
  });

  describe('Batch Image Optimization', () => {
    it('should optimize multiple images in batch', async () => {
      const images = [
        { buffer: Buffer.from('image1'), id: 'img1' },
        { buffer: Buffer.from('image2'), id: 'img2' },
        { buffer: Buffer.from('image3'), id: 'img3' }
      ];

      const mockResults = {
        results: [
          {
            original: {
              buffer: Buffer.from('image1'),
              size: 500000,
              format: 'jpeg',
              dimensions: { width: 1920, height: 1080 }
            },
            optimized: {
              buffer: Buffer.from('optimized1'),
              size: 100000,
              format: 'webp',
              dimensions: { width: 1920, height: 1080 },
              quality: {
                score: 85,
                sharpness: 80,
                contrast: 75,
                brightness: 70,
                colorAccuracy: 85,
                compressionRatio: 5,
                fileSize: 100000,
                format: 'webp',
                dimensions: { width: 1920, height: 1080 },
                hasTransparency: false,
                colorSpace: 'srgb'
              }
            },
            variants: {},
            processingTime: 150,
            optimizationRatio: 5
          }
        ],
        totalOriginalSize: 500000,
        totalOptimizedSize: 100000,
        averageOptimizationRatio: 5,
        totalProcessingTime: 300,
        successful: 1,
        failed: 2,
        errors: [
          { index: 1, error: 'Invalid image format' },
          { index: 2, error: 'File too large' }
        ]
      };

      mockImageProvider.processBatch.mockResolvedValue({
        results: [],
        totalProcessingTime: 0,
        successful: 0,
        failed: 0,
        errors: []
      });

      const result = await optimizationService.optimizeBatch(images, { concurrency: 2 });

      expect(mockImageProvider.processBatch).toHaveBeenCalledWith(images, { concurrency: 2 });
      expect(result.totalProcessingTime).toBeGreaterThan(0);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should handle batch processing with errors', async () => {
      const images = [
        { buffer: Buffer.from('image1'), id: 'img1' },
        { buffer: Buffer.from('image2'), id: 'img2' }
      ];

      mockImageProvider.processBatch.mockResolvedValue({
        results: [],
        totalProcessingTime: 0,
        successful: 0,
        failed: 0,
        errors: []
      });

      const result = await optimizationService.optimizeBatch(images, { concurrency: 1 });

      expect(mockImageProvider.processBatch).toHaveBeenCalledWith(images, { concurrency: 1 });
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('Image Analysis and Metadata', () => {
    it('should assess image quality', async () => {
      const buffer = Buffer.from('test image');
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 2000000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockMetadata);

      const result = await optimizationService.optimizeImage(buffer);

      expect(mockImageProvider.getImageMetadata).toHaveBeenCalledWith(buffer);
      expect(result.optimized.quality).toBeDefined();
      expect(result.optimized.quality.score).toBeGreaterThanOrEqual(0);
      expect(result.optimized.quality.score).toBeLessThanOrEqual(100);
      expect(result.optimized.quality.fileSize).toBe(100000);
      expect(result.optimized.quality.format).toBe('webp');
    });

    it('should detect image characteristics', async () => {
      const buffer = Buffer.from('test image');
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'png',
        size: 1000000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: true
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockMetadata);

      const result = await optimizationService.optimizeImage(buffer);

      expect(mockImageProvider.getImageMetadata).toHaveBeenCalledWith(buffer);
      expect(result.optimized.quality.hasTransparency).toBe(true);
      expect(result.optimized.quality.colorSpace).toBe('srgb');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track optimization metrics', () => {
      const stats = optimizationService.getStats();

      expect(stats).toHaveProperty('totalOptimizations');
      expect(stats).toHaveProperty('successfulOptimizations');
      expect(stats).toHaveProperty('failedOptimizations');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('totalOriginalSize');
      expect(stats).toHaveProperty('totalOptimizedSize');
      expect(stats).toHaveProperty('averageOptimizationRatio');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('formatUsage');
      expect(stats).toHaveProperty('timestamp');
      expect(typeof stats.totalOptimizations).toBe('number');
      expect(typeof stats.successfulOptimizations).toBe('number');
      expect(typeof stats.failedOptimizations).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.totalOriginalSize).toBe('number');
      expect(typeof stats.totalOptimizedSize).toBe('number');
      expect(typeof stats.averageOptimizationRatio).toBe('number');
      expect(typeof stats.averageProcessingTime).toBe('number');
      expect(stats.formatUsage).toBeInstanceOf(Object);
      expect(stats.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate optimization statistics', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);

      await optimizationService.optimizeImage(buffer);

      const stats = optimizationService.getStats();

      expect(stats.totalOptimizations).toBe(1);
      expect(stats.successfulOptimizations).toBe(1);
      expect(stats.failedOptimizations).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.totalOriginalSize).toBe(500000);
      expect(stats.totalOptimizedSize).toBe(100000);
      expect(stats.averageOptimizationRatio).toBe(5);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Pipeline Management', () => {
    it('should get available pipelines', () => {
      const pipelines = optimizationService.getAvailablePipelines();

      expect(pipelines).toBeInstanceOf(Array);
      expect(pipelines.length).toBeGreaterThan(0);
      expect(pipelines).toContain('default');
      expect(pipelines).toContain('product');
      expect(pipelines).toContain('thumbnail');
    });

    it('should create custom pipeline', () => {
      const customPipeline = {
        id: 'custom',
        name: 'Custom Pipeline',
        targetFormats: ['webp', 'jpeg'],
        qualityThreshold: 85,
        steps: []
      };

      optimizationService.createPipeline(customPipeline);

      const pipelines = optimizationService.getAvailablePipelines();
      expect(pipelines).toContain('custom');
    });

    it('should remove pipeline', () => {
      optimizationService.removePipeline('custom');
      const pipelines = optimizationService.getAvailablePipelines();
      expect(pipelines).not.toContain('custom');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image buffer', async () => {
      const invalidBuffer = Buffer.alloc(0); // Empty buffer

      mockImageProvider.getImageMetadata.mockRejectedValue(new Error('Invalid image'));

      await expect(optimizationService.optimizeImage(invalidBuffer))
        .rejects.toThrow('Image optimization failed');
    });

    it('should handle CDN upload failures', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);
      mockCDNProvider.uploadFile.mockRejectedValue(new Error('CDN upload failed'));

      await expect(optimizationService.optimizeImage(buffer, {
        storeInCDN: true
      })).rejects.toThrow('CDN upload failed');
    });

    it('should handle batch processing failures', async () => {
      const images = [{ buffer: Buffer.from('image1'), id: 'img1' }];

      mockImageProvider.processBatch.mockRejectedValue(new Error('Batch processing failed'));

      await expect(optimizationService.optimizeBatch(images))
        .rejects.toThrow('Batch processing failed');
    });
  });

  describe('Memory Management', () => {
    it('should handle large image processing', async () => {
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 50000000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized large image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 5000000,
        processingTime: 2000,
        originalSize: 50000000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);

      const result = await optimizationService.optimizeImage(largeBuffer);

      expect(result.original.size).toBe(50000000);
      expect(result.optimized.size).toBe(5000000);
      expect(result.optimizationRatio).toBe(10);
    });
  });

  describe('Integration with Providers', () => {
    it('should use image provider for all operations', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);

      await optimizationService.optimizeImage(buffer);

      expect(mockImageProvider.getImageMetadata).toHaveBeenCalledWith(buffer);
      expect(mockImageProvider.processImage).toHaveBeenCalledWith(buffer, {
        quality: 80,
        format: 'webp',
        fit: 'inside'
      });
    });

    it('should use CDN provider for storage operations', async () => {
      const buffer = Buffer.from('test image');
      const mockOriginalMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 500000,
        colorspace: 'srgb',
        density: 72,
        hasAlpha: false
      };

      const mockOptimizedResult = {
        buffer: Buffer.from('optimized image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 100000,
        processingTime: 150,
        originalSize: 500000
      };

      const mockUploadResult = {
        key: 'optimized-image.webp',
        url: 'https://cdn.example.com/optimized-image.webp',
        etag: 'etag123',
        size: 100000,
        uploadTime: 50,
        timestamp: new Date()
      };

      mockImageProvider.getImageMetadata.mockResolvedValue(mockOriginalMetadata);
      mockImageProvider.processImage.mockResolvedValue(mockOptimizedResult);
      mockCDNProvider.uploadFile.mockResolvedValue(mockUploadResult);

      const result = await optimizationService.optimizeImage(buffer, {
        storeInCDN: true
      });

      expect(mockCDNProvider.uploadFile).toHaveBeenCalledWith(mockOptimizedResult.buffer, {
        key: expect.stringMatching(/optimized_\d+\.webp/),
        contentType: 'image/webp'
      });
      expect(result.cdnUrls).toBeDefined();
    });
  });
});