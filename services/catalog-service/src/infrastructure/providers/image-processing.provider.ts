/**
 * Image Processing Provider Implementation
 * Infrastructure layer image processing integrations
 * Sharp-based image processing with circuit breaker and monitoring
 */

import { CircuitBreaker, RetryPolicy, ProviderManager } from './index';
import sharp from 'sharp';
import { getSharedRedisClient } from '@shared/redis/ioredis-client';

/**
 * Image Processing Provider Types
 */
export enum ImageProcessingProvider {
  SHARP = 'sharp',
  IMAGEMAGICK = 'imagemagick',
  GRAPHICSMAGICK = 'graphicsmagick',
  CLOUDFLARE_IMAGES = 'cloudflare_images',
  IMGPROXY = 'imgproxy'
}

/**
 * Image Processing Configuration
 */
export interface ImageProcessingConfig {
  provider: ImageProcessingProvider;
  maxFileSize: number; // bytes
  allowedFormats: string[];
  quality: number; // 1-100
  timeout: number;
  concurrency: number;
  cacheEnabled: boolean;
  cacheDir?: string;
  tempDir?: string;
}

/**
 * Image Processing Options
 */
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'center';
  background?: string; // hex color
  rotate?: number;
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  negate?: boolean;
  normalize?: boolean;
  tint?: string; // hex color
  watermark?: {
    text?: string;
    image?: Buffer;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    margin: number;
  };
}

/**
 * Image Processing Result
 */
export interface ImageProcessingResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number; // bytes
  processingTime: number;
  originalSize: number;
}

/**
 * Batch Processing Result
 */
export interface BatchProcessingResult {
  results: ImageProcessingResult[];
  totalProcessingTime: number;
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

/**
 * Sharp Image Processing Provider
 */
export class SharpImageProvider {
  private config: ImageProcessingConfig;
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;
  private redisClient: ReturnType<typeof getSharedRedisClient> | null = null;
  private metrics = {
    processed: 0,
    failed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  private processingQueue: Array<{
    buffer: Buffer;
    options: ImageProcessingOptions;
    resolve: (result: ImageProcessingResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(config: ImageProcessingConfig) {
    this.config = config;
    this.circuitBreaker = ProviderManager.getInstance().getCircuitBreaker('image-processing');
    this.retryPolicy = ProviderManager.getInstance().getRetryPolicy('image-processing');
  }

  /**
   * Process a single image
   */
  async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    // Validate input
    this.validateImage(buffer, options);

    return await this.executeWithResilience(async () => {
      const startTime = Date.now();

      try {
        // Check cache first
        const cacheKey = this.generateCacheKey(buffer, options);
        if (this.config.cacheEnabled) {
          const cached = await this.getFromCache(cacheKey);
          if (cached) {
            this.metrics.cacheHits++;
            return {
              ...cached,
              processingTime: Date.now() - startTime
            };
          }
          this.metrics.cacheMisses++;
        }

        // Process image using Sharp
        const result = await this.processWithSharp(buffer, options);

        // Cache result
        if (this.config.cacheEnabled) {
          // Create a complete result for caching
          const cacheResult = {
            ...result,
            processingTime: 0, // Will be set later
            originalSize: buffer.length
          };
          await this.saveToCache(cacheKey, cacheResult);
        }

        const processingTime = Date.now() - startTime;
        this.recordMetrics(true, processingTime);

        return {
          buffer: result.buffer,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size,
          processingTime,
          originalSize: buffer.length
        };
      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.recordMetrics(false, processingTime);
        throw error;
      }
    });
  }

  /**
   * Process multiple images in batch
   */
  async processBatch(
    images: Array<{ buffer: Buffer; options?: ImageProcessingOptions }>,
    options: { concurrency?: number } = {}
  ): Promise<BatchProcessingResult> {
    const concurrency = options.concurrency || this.config.concurrency;
    const startTime = Date.now();
    const results: ImageProcessingResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Process in batches to control concurrency
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);

      const batchPromises = batch.map(async (image, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.processImage(image.buffer, image.options || {});
          results[globalIndex] = result;
        } catch (error) {
          errors.push({
            index: globalIndex,
            error: (error as Error).message
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return {
      results: results.filter(Boolean),
      totalProcessingTime: Date.now() - startTime,
      successful: results.filter(Boolean).length,
      failed: errors.length,
      errors
    };
  }

  /**
   * Get image metadata without processing
   */
  async getImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    colorspace?: string;
    density?: number;
    hasAlpha?: boolean;
  }> {
    return await this.executeWithResilience(async () => {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        colorspace: metadata.space,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha
      };
    });
  }

  /**
   * Generate image thumbnails
   */
  async generateThumbnails(
    buffer: Buffer,
    sizes: Array<{ width: number; height?: number; suffix: string }>
  ): Promise<Record<string, ImageProcessingResult>> {
    const results: Record<string, ImageProcessingResult> = {};

    for (const size of sizes) {
      const options: ImageProcessingOptions = {
        width: size.width,
        height: size.height,
        fit: 'cover'
      };

      const result = await this.processImage(buffer, options);
      results[size.suffix] = result;
    }

    return results;
  }

  /**
   * Convert image format
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    quality: number = this.config.quality
  ): Promise<ImageProcessingResult> {
    return await this.processImage(buffer, {
      format: targetFormat,
      quality
    });
  }

  /**
   * Optimize image for web
   */
  async optimizeForWeb(buffer: Buffer): Promise<ImageProcessingResult> {
    const metadata = await this.getImageMetadata(buffer);

    // Choose optimal format and settings
    const options: ImageProcessingOptions = {
      quality: this.config.quality
    };

    if (metadata.hasAlpha) {
      options.format = 'webp'; // Better for images with transparency
    } else {
      options.format = 'jpeg'; // Better compression for photos
    }

    // Resize if too large
    if (metadata.width > 1920) {
      options.width = 1920;
      options.height = Math.round((metadata.height * 1920) / metadata.width);
      options.fit = 'inside';
    }

    return await this.processImage(buffer, options);
  }

  /**
   * Execute operation with resilience (circuit breaker + retry)
   */
  private async executeWithResilience<T>(operation: () => Promise<T>): Promise<T> {
    return await ProviderManager.getInstance().executeWithResilience(
      'image-processing',
      operation
    );
  }

  /**
   * Process image using Sharp library
   */
  private async processWithSharp(
    buffer: Buffer,
    options: ImageProcessingOptions
  ): Promise<Omit<ImageProcessingResult, 'processingTime' | 'originalSize'>> {
    let pipeline = sharp(buffer);

    if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center',
        background: options.background
      });
    }

    if (options.rotate) {
      pipeline = pipeline.rotate(options.rotate);
    }

    if (options.blur) {
      pipeline = pipeline.blur(options.blur);
    }

    if (options.sharpen) {
      pipeline = pipeline.sharpen();
    }

    if (options.grayscale) {
      pipeline = pipeline.grayscale();
    }

    if (options.negate) {
      pipeline = pipeline.negate();
    }

    if (options.normalize) {
      pipeline = pipeline.normalize();
    }

    if (options.tint) {
      pipeline = pipeline.tint(options.tint);
    }

    if (options.watermark) {
      const gravityMap: Record<string, string> = {
        'top-left': 'northwest',
        'top-right': 'northeast',
        'bottom-left': 'southwest',
        'bottom-right': 'southeast',
        'center': 'center'
      };

      if (options.watermark.image) {
        pipeline = pipeline.composite([{
          input: options.watermark.image,
          gravity: gravityMap[options.watermark.position] || 'southeast'
        }]);
      } else if (options.watermark.text) {
        const svg = Buffer.from(
          `<svg width="500" height="200">
            <style>
              .title { fill: rgba(255,255,255,${options.watermark.opacity}); font-size: 32px; font-family: Arial, sans-serif; }
            </style>
            <text x="0" y="32" class="title">${options.watermark.text}</text>
          </svg>`
        );
        pipeline = pipeline.composite([{
          input: svg,
          gravity: gravityMap[options.watermark.position] || 'southeast'
        }]);
      }
    }

    pipeline = pipeline.toFormat(options.format || 'jpeg', {
      quality: options.quality || this.config.quality
    });

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      format: metadata.format || options.format || 'unknown',
      width: metadata.width || options.width || 0,
      height: metadata.height || options.height || 0,
      size: outputBuffer.length
    };
  }

  /**
   * Validate image input
   */
  private validateImage(buffer: Buffer, options: ImageProcessingOptions): void {
    // Check file size
    if (buffer.length > this.config.maxFileSize) {
      throw new Error(`Image size ${buffer.length} exceeds maximum allowed size ${this.config.maxFileSize}`);
    }

    // Check format (would need to detect actual format in real implementation)
    if (options.format && !this.config.allowedFormats.includes(options.format)) {
      throw new Error(`Format ${options.format} is not allowed`);
    }

    // Validate dimensions
    if (options.width && (options.width <= 0 || options.width > 10000)) {
      throw new Error('Invalid width specified');
    }

    if (options.height && (options.height <= 0 || options.height > 10000)) {
      throw new Error('Invalid height specified');
    }

    // Validate quality
    if (options.quality && (options.quality < 1 || options.quality > 100)) {
      throw new Error('Quality must be between 1 and 100');
    }
  }

  /**
   * Generate cache key for processed images
   */
  private generateCacheKey(buffer: Buffer, options: ImageProcessingOptions): string {
    // Create a hash of the buffer and options for caching
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
  }

  /**
   * Get processed image from cache
   */
  private async getFromCache(cacheKey: string): Promise<ImageProcessingResult | null> {
    const redis = this.getRedisClient();
    if (!redis) {
      return null;
    }

    const cached = await redis.get(`image:processed:${cacheKey}`);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return {
      ...parsed,
      buffer: Buffer.from(parsed.buffer, 'base64')
    } as ImageProcessingResult;
  }

  /**
   * Save processed image to cache
   */
  private async saveToCache(cacheKey: string, result: ImageProcessingResult): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) {
      return;
    }

    const payload = {
      ...result,
      buffer: result.buffer.toString('base64')
    };
    await redis.setex(`image:processed:${cacheKey}`, 3600, JSON.stringify(payload));
  }

  /**
   * Record processing metrics
   */
  private recordMetrics(success: boolean, processingTime: number): void {
    if (success) {
      this.metrics.processed++;
    } else {
      this.metrics.failed++;
    }

    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime =
      this.metrics.totalProcessingTime / (this.metrics.processed + this.metrics.failed);
  }

  /**
   * Get processing metrics
   */
  getMetrics(): {
    processed: number;
    failed: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    timestamp: Date;
  } {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? this.metrics.cacheHits / totalCacheRequests : 0;

    return {
      ...this.metrics,
      cacheHitRate,
      timestamp: new Date()
    };
  }

  /**
   * Lazily obtain the shared Redis client only when caching is enabled.
   * This avoids opening a TCP connection in tests or deployments that do not
   * use image result caching.
   */
  private getRedisClient(): ReturnType<typeof getSharedRedisClient> | null {
    if (!this.config.cacheEnabled) {
      return null;
    }

    if (!this.redisClient) {
      this.redisClient = getSharedRedisClient();
    }

    return this.redisClient;
  }
}

/**
 * Image Processing Provider Factory
 */
export class ImageProcessingProviderFactory {
  private static instance: SharpImageProvider | null = null;

  static createSharp(config: ImageProcessingConfig): SharpImageProvider {
    return new SharpImageProvider(config);
  }

  static createDefault(config: ImageProcessingConfig): SharpImageProvider {
    const provider = config.provider || ImageProcessingProvider.SHARP;

    switch (provider) {
      case ImageProcessingProvider.SHARP:
      default:
        return this.createSharp(config);
    }
  }

  static getInstance(): SharpImageProvider | null {
    return this.instance;
  }

  static setInstance(provider: SharpImageProvider): void {
    if (this.instance) {
      throw new Error('Image processing provider instance already exists');
    }
    this.instance = provider;
  }
}

/**
 * Image Processing Pipeline
 * Chain multiple processing operations
 */
export class ImageProcessingPipeline {
  private operations: Array<{
    name: string;
    operation: (buffer: Buffer) => Promise<Buffer>;
  }> = [];

  addOperation(name: string, operation: (buffer: Buffer) => Promise<Buffer>): ImageProcessingPipeline {
    this.operations.push({ name, operation });
    return this;
  }

  async execute(buffer: Buffer): Promise<Buffer> {
    let currentBuffer = buffer;

    for (const { name, operation } of this.operations) {
      try {
        currentBuffer = await operation(currentBuffer);
      } catch (error) {
        throw new Error(`Pipeline operation '${name}' failed: ${(error as Error).message}`);
      }
    }

    return currentBuffer;
  }

  clear(): void {
    this.operations = [];
  }

  getOperations(): string[] {
    return this.operations.map(op => op.name);
  }
}

/**
 * Predefined Image Processing Operations
 */
export class ImageOperations {
  static resize(width: number, height?: number, options?: { fit?: string; position?: string }): (buffer: Buffer) => Promise<Buffer> {
    return async (buffer: Buffer) => {
      return sharp(buffer)
        .resize({
          width,
          height,
          fit: (options?.fit as any) || 'cover',
          position: (options?.position as any) || 'center'
        })
        .toBuffer();
    };
  }

  static compress(quality: number): (buffer: Buffer) => Promise<Buffer> {
    return async (buffer: Buffer) => {
      return sharp(buffer)
        .jpeg({ quality })
        .toBuffer();
    };
  }

  static convert(format: string): (buffer: Buffer) => Promise<Buffer> {
    return async (buffer: Buffer) => {
      return sharp(buffer)
        .toFormat(format as any)
        .toBuffer();
    };
  }

  static watermark(text: string, options?: { position?: string; opacity?: number }): (buffer: Buffer) => Promise<Buffer> {
    return async (buffer: Buffer) => {
      const opacity = options?.opacity ?? 0.5;
      const svg = Buffer.from(
        `<svg width="500" height="200">
          <style>
            .title { fill: rgba(255,255,255,${opacity}); font-size: 32px; font-family: Arial, sans-serif; }
          </style>
          <text x="0" y="32" class="title">${text}</text>
        </svg>`
      );

      const gravityMap: Record<string, string> = {
        'top-left': 'northwest',
        'top-right': 'northeast',
        'bottom-left': 'southwest',
        'bottom-right': 'southeast',
        'center': 'center'
      };

      return sharp(buffer)
        .composite([{
          input: svg,
          gravity: gravityMap[options?.position || 'bottom-right'] || 'southeast'
        }])
        .toBuffer();
    };
  }

  static optimize(): (buffer: Buffer) => Promise<Buffer> {
    return async (buffer: Buffer) => {
      const metadata = await sharp(buffer).metadata();
      const format = metadata.hasAlpha ? 'webp' : 'jpeg';
      let pipeline = sharp(buffer).toFormat(format as any, { quality: 80 });

      if (metadata.width && metadata.width > 1920) {
        pipeline = pipeline.resize({ width: 1920, fit: 'inside' });
      }

      return pipeline.toBuffer();
    };
  }
}

/**
 * Image Processing Health Monitor
 */
export class ImageProcessingHealthMonitor {
  constructor(private provider: SharpImageProvider) {}

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    processedToday: number;
    errorRate: number;
    averageProcessingTime: number;
  }> {
    try {
      // Test with a small dummy image
      const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      const startTime = Date.now();
      await this.provider.getImageMetadata(testBuffer);
      const responseTime = Date.now() - startTime;

      const metrics = this.provider.getMetrics();
      const errorRate = (metrics.processed + metrics.failed) > 0
        ? metrics.failed / (metrics.processed + metrics.failed)
        : 0;

      // Determine status based on error rate and response time
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (errorRate > 0.1 || responseTime > 5000) {
        status = 'degraded';
      }
      if (errorRate > 0.5 || responseTime > 10000) {
        status = 'unhealthy';
      }

      return {
        status,
        responseTime,
        processedToday: metrics.processed,
        errorRate,
        averageProcessingTime: metrics.averageProcessingTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: -1,
        processedToday: 0,
        errorRate: 1,
        averageProcessingTime: 0
      };
    }
  }
}
