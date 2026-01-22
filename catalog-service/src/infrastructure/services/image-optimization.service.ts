/**
 * Image Optimization Service Implementation
 * Infrastructure layer image processing pipeline and optimization
 * Advanced image optimization with quality assessment and format selection
 */

import { Readable } from 'stream';
import { SharpImageProvider, ImageProcessingOptions, ImageProcessingResult } from '../providers/image-processing.provider';
import { S3CDNProvider } from '../providers/cdn.provider';

/**
 * Image Optimization Configuration
 */
export interface ImageOptimizationConfig {
  qualityThreshold: number; // Minimum acceptable quality score (0-100)
  maxProcessingTime: number; // Maximum processing time in ms
  enableProgressiveLoading: boolean;
  enableMetadataStripping: boolean;
  enableColorOptimization: boolean;
  defaultFormats: ('jpeg' | 'png' | 'webp' | 'avif')[];
  sizeVariants: {
    thumbnail: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
  };
  compression: {
    jpeg: { quality: number; progressive: boolean };
    webp: { quality: number; effort: number };
    avif: { quality: number; effort: number };
  };
}

/**
 * Default Image Optimization Configuration
 */
export const DEFAULT_IMAGE_OPTIMIZATION_CONFIG: ImageOptimizationConfig = {
  qualityThreshold: 80,
  maxProcessingTime: 30000, // 30 seconds
  enableProgressiveLoading: true,
  enableMetadataStripping: true,
  enableColorOptimization: true,
  defaultFormats: ['webp', 'avif', 'jpeg'],
  sizeVariants: {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 800, height: 600 },
    large: { width: 1920, height: 1080 }
  },
  compression: {
    jpeg: { quality: 85, progressive: true },
    webp: { quality: 80, effort: 4 },
    avif: { quality: 70, effort: 6 }
  }
};

/**
 * Image Quality Assessment Result
 */
export interface ImageQualityAssessment {
  score: number; // 0-100 quality score
  sharpness: number; // 0-100 sharpness score
  contrast: number; // 0-100 contrast score
  brightness: number; // 0-100 brightness score
  colorAccuracy: number; // 0-100 color accuracy score
  compressionRatio: number; // Original size / optimized size
  fileSize: number;
  format: string;
  dimensions: { width: number; height: number };
  hasTransparency: boolean;
  colorSpace: string;
}

/**
 * Image Optimization Result
 */
export interface ImageOptimizationResult {
  original: {
    buffer: Buffer;
    size: number;
    format: string;
    dimensions: { width: number; height: number };
  };
  optimized: {
    buffer: Buffer;
    size: number;
    format: string;
    dimensions: { width: number; height: number };
    quality: ImageQualityAssessment;
  };
  variants: Record<string, {
    buffer: Buffer;
    size: number;
    dimensions: { width: number; height: number };
    url?: string;
  }>;
  processingTime: number;
  optimizationRatio: number;
  cdnUrls?: Record<string, string>;
}

/**
 * Batch Optimization Result
 */
export interface BatchOptimizationResult {
  results: ImageOptimizationResult[];
  totalOriginalSize: number;
  totalOptimizedSize: number;
  averageOptimizationRatio: number;
  totalProcessingTime: number;
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

/**
 * Image Optimization Pipeline
 */
export interface OptimizationPipeline {
  id: string;
  name: string;
  steps: OptimizationStep[];
  targetFormats: string[];
  qualityThreshold: number;
}

/**
 * Optimization Pipeline Step
 */
export interface OptimizationStep {
  name: string;
  operation: (image: Buffer, context: any) => Promise<Buffer>;
  condition?: (context: any) => boolean;
  priority: number;
}

/**
 * Image Optimization Service
 * Advanced image optimization with quality assessment and pipeline processing
 */
export class ImageOptimizationService {
  private config: ImageOptimizationConfig;
  private imageProcessor: SharpImageProvider;
  private cdnProvider?: S3CDNProvider;
  private pipelines = new Map<string, OptimizationPipeline>();
  private metrics = {
    totalOptimizations: 0,
    successfulOptimizations: 0,
    failedOptimizations: 0,
    totalOriginalSize: 0,
    totalOptimizedSize: 0,
    averageProcessingTime: 0,
    averageOptimizationRatio: 0,
    formatUsage: new Map<string, number>()
  };

  constructor(
    config: Partial<ImageOptimizationConfig> = {},
    imageProcessor: SharpImageProvider,
    cdnProvider?: S3CDNProvider
  ) {
    this.config = { ...DEFAULT_IMAGE_OPTIMIZATION_CONFIG, ...config };
    this.imageProcessor = imageProcessor;
    this.cdnProvider = cdnProvider;
    this.initializeDefaultPipelines();
  }

  /**
   * Optimize single image with comprehensive processing
   */
  async optimizeImage(
    buffer: Buffer,
    options: {
      pipeline?: string;
      targetFormats?: string[];
      generateVariants?: boolean;
      storeInCDN?: boolean;
      customPath?: string;
    } = {}
  ): Promise<ImageOptimizationResult> {
    const startTime = Date.now();

    try {
      // Get original image metadata
      const originalMetadata = await this.imageProcessor.getImageMetadata(buffer);

      // Assess original image quality
      const originalQuality = await this.assessImageQuality(buffer, originalMetadata);

      // Select optimization pipeline
      const pipeline = this.getPipeline(options.pipeline || 'default');

      // Run optimization pipeline
      const optimizedBuffer = await this.runOptimizationPipeline(buffer, pipeline, {
        originalMetadata,
        originalQuality
      });

      // Assess optimized image quality
      const optimizedMetadata = await this.imageProcessor.getImageMetadata(optimizedBuffer);
      const optimizedQuality = await this.assessImageQuality(optimizedBuffer, optimizedMetadata);

      // Generate variants if requested
      const variants = options.generateVariants
        ? await this.generateVariants(buffer, optimizedMetadata)
        : {};

      // Store in CDN if requested
      const cdnUrls = options.storeInCDN
        ? await this.storeOptimizedImages(optimizedBuffer, variants, options.customPath)
        : undefined;

      const processingTime = Date.now() - startTime;
      const optimizationRatio = originalMetadata.size / optimizedMetadata.size;

      // Update metrics
      this.updateMetrics(true, originalMetadata.size, optimizedMetadata.size, processingTime, optimizedMetadata.format);

      return {
        original: {
          buffer,
          size: originalMetadata.size,
          format: originalMetadata.format,
          dimensions: { width: originalMetadata.width, height: originalMetadata.height }
        },
        optimized: {
          buffer: optimizedBuffer,
          size: optimizedMetadata.size,
          format: optimizedMetadata.format,
          dimensions: { width: optimizedMetadata.width, height: optimizedMetadata.height },
          quality: optimizedQuality
        },
        variants,
        processingTime,
        optimizationRatio,
        cdnUrls
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, buffer.length, 0, processingTime, 'unknown');

      throw new Error(`Image optimization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Optimize multiple images in batch
   */
  async optimizeBatch(
    images: Array<{ buffer: Buffer; id?: string }>,
    options: {
      pipeline?: string;
      concurrency?: number;
      storeInCDN?: boolean;
      customPath?: string;
    } = {}
  ): Promise<BatchOptimizationResult> {
    const concurrency = options.concurrency || 3;
    const startTime = Date.now();
    const results: ImageOptimizationResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    // Process images in batches to control concurrency
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);

      const batchPromises = batch.map(async (image, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.optimizeImage(image.buffer, {
            pipeline: options.pipeline,
            generateVariants: true,
            storeInCDN: options.storeInCDN,
            customPath: options.customPath
          });

          results[globalIndex] = result;
          totalOriginalSize += result.original.size;
          totalOptimizedSize += result.optimized.size;
        } catch (error) {
          errors.push({
            index: globalIndex,
            error: (error as Error).message
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    const validResults = results.filter(Boolean);
    const averageOptimizationRatio = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.optimizationRatio, 0) / validResults.length
      : 0;

    return {
      results: validResults,
      totalOriginalSize,
      totalOptimizedSize,
      averageOptimizationRatio,
      totalProcessingTime: Date.now() - startTime,
      successful: validResults.length,
      failed: errors.length,
      errors
    };
  }

  /**
   * Assess image quality metrics
   */
  private async assessImageQuality(
    buffer: Buffer,
    metadata: any
  ): Promise<ImageQualityAssessment> {
    // In a real implementation, this would use image analysis libraries
    // For now, simulate quality assessment
    const baseScore = 85; // Assume good quality by default
    const formatBonus = metadata.format === 'webp' ? 5 : metadata.format === 'avif' ? 10 : 0;
    const sizePenalty = metadata.size > 1024 * 1024 ? -10 : 0; // Penalty for large files

    const score = Math.max(0, Math.min(100, baseScore + formatBonus + sizePenalty));

    return {
      score,
      sharpness: 80 + Math.random() * 20,
      contrast: 75 + Math.random() * 25,
      brightness: 70 + Math.random() * 30,
      colorAccuracy: 85 + Math.random() * 15,
      compressionRatio: 1.0, // Would be calculated in real implementation
      fileSize: metadata.size,
      format: metadata.format,
      dimensions: { width: metadata.width, height: metadata.height },
      hasTransparency: metadata.hasAlpha || false,
      colorSpace: metadata.colorspace || 'srgb'
    };
  }

  /**
   * Run optimization pipeline
   */
  private async runOptimizationPipeline(
    buffer: Buffer,
    pipeline: OptimizationPipeline,
    context: any
  ): Promise<Buffer> {
    let currentBuffer = buffer;

    // Sort steps by priority
    const sortedSteps = pipeline.steps.sort((a, b) => a.priority - b.priority);

    for (const step of sortedSteps) {
      if (step.condition && !step.condition(context)) {
        continue; // Skip step if condition not met
      }

      try {
        currentBuffer = await step.operation(currentBuffer, context);
      } catch (error) {
        console.warn(`Pipeline step '${step.name}' failed:`, error);
        // Continue with next step despite failure
      }
    }

    return currentBuffer;
  }

  /**
   * Generate image variants (thumbnail, medium, large)
   */
  private async generateVariants(
    buffer: Buffer,
    metadata: any
  ): Promise<Record<string, { buffer: Buffer; size: number; dimensions: { width: number; height: number } }>> {
    const variants: Record<string, any> = {};

    for (const [variantName, size] of Object.entries(this.config.sizeVariants)) {
      try {
        const result = await this.imageProcessor.processImage(buffer, {
          width: size.width,
          height: size.height,
          fit: 'cover',
          quality: 85
        });

        variants[variantName] = {
          buffer: result.buffer,
          size: result.size,
          dimensions: { width: result.width, height: result.height }
        };
      } catch (error) {
        console.warn(`Failed to generate ${variantName} variant:`, error);
      }
    }

    return variants;
  }

  /**
   * Store optimized images in CDN
   */
  private async storeOptimizedImages(
    optimizedBuffer: Buffer,
    variants: Record<string, any>,
    customPath?: string
  ): Promise<Record<string, string>> {
    if (!this.cdnProvider) {
      throw new Error('CDN provider not configured');
    }

    const basePath = customPath || 'optimized-images';
    const urls: Record<string, string> = {};

    try {
      // Store optimized version
      const optimizedResult = await this.cdnProvider.uploadFile(optimizedBuffer, {
        key: `${basePath}/optimized_${Date.now()}.webp`,
        contentType: 'image/webp'
      });
      urls.optimized = optimizedResult.url!;

      // Store variants
      for (const [variantName, variant] of Object.entries(variants)) {
        const variantResult = await this.cdnProvider.uploadFile(variant.buffer, {
          key: `${basePath}/${variantName}_${Date.now()}.webp`,
          contentType: 'image/webp'
        });
        urls[variantName] = variantResult.url!;
      }
    } catch (error) {
      console.error('Failed to store optimized images in CDN:', error);
      throw error;
    }

    return urls;
  }

  /**
   * Get optimization pipeline
   */
  private getPipeline(pipelineId: string): OptimizationPipeline {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Optimization pipeline '${pipelineId}' not found`);
    }
    return pipeline;
  }

  /**
   * Initialize default optimization pipelines
   */
  private initializeDefaultPipelines(): void {
    // Web optimization pipeline
    const webPipeline: OptimizationPipeline = {
      id: 'default',
      name: 'Web Optimization',
      targetFormats: this.config.defaultFormats,
      qualityThreshold: this.config.qualityThreshold,
      steps: [
        {
          name: 'format-selection',
          operation: this.selectOptimalFormat.bind(this),
          priority: 1
        },
        {
          name: 'resize-large',
          operation: this.resizeIfTooLarge.bind(this),
          condition: (context) => context.originalMetadata.width > 1920,
          priority: 2
        },
        {
          name: 'strip-metadata',
          operation: this.stripMetadata.bind(this),
          condition: () => this.config.enableMetadataStripping,
          priority: 3
        },
        {
          name: 'optimize-colors',
          operation: this.optimizeColors.bind(this),
          condition: () => this.config.enableColorOptimization,
          priority: 4
        },
        {
          name: 'apply-compression',
          operation: this.applyCompression.bind(this),
          priority: 5
        },
        {
          name: 'progressive-loading',
          operation: this.enableProgressiveLoading.bind(this),
          condition: () => this.config.enableProgressiveLoading,
          priority: 6
        }
      ]
    };

    // Product image pipeline
    const productPipeline: OptimizationPipeline = {
      id: 'product',
      name: 'Product Images',
      targetFormats: ['webp', 'jpeg'],
      qualityThreshold: 90,
      steps: [
        ...webPipeline.steps,
        {
          name: 'add-watermark',
          operation: this.addWatermark.bind(this),
          priority: 7
        }
      ]
    };

    // Thumbnail pipeline
    const thumbnailPipeline: OptimizationPipeline = {
      id: 'thumbnail',
      name: 'Thumbnails',
      targetFormats: ['webp'],
      qualityThreshold: 75,
      steps: [
        {
          name: 'resize-thumbnail',
          operation: this.resizeToThumbnail.bind(this),
          priority: 1
        },
        {
          name: 'optimize-colors',
          operation: this.optimizeColors.bind(this),
          priority: 2
        },
        {
          name: 'apply-compression',
          operation: this.applyCompression.bind(this),
          priority: 3
        }
      ]
    };

    this.pipelines.set('default', webPipeline);
    this.pipelines.set('product', productPipeline);
    this.pipelines.set('thumbnail', thumbnailPipeline);
  }

  /**
   * Pipeline step: Select optimal format
   */
  private async selectOptimalFormat(buffer: Buffer, context: any): Promise<Buffer> {
    const { originalMetadata } = context;

    // Determine best format based on image characteristics
    let targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' = 'jpeg';

    if (originalMetadata.hasAlpha) {
      targetFormat = 'webp'; // WebP supports transparency well
    } else if (this.config.defaultFormats.includes('avif')) {
      targetFormat = 'avif'; // AVIF for best compression
    } else if (this.config.defaultFormats.includes('webp')) {
      targetFormat = 'webp'; // WebP as fallback
    }

    if (originalMetadata.format !== targetFormat) {
      const result = await this.imageProcessor.convertFormat(buffer, targetFormat);
      return result.buffer;
    }

    return buffer;
  }

  /**
   * Pipeline step: Resize if too large
   */
  private async resizeIfTooLarge(buffer: Buffer, context: any): Promise<Buffer> {
    const { originalMetadata } = context;

    if (originalMetadata.width <= 1920) {
      return buffer;
    }

    const result = await this.imageProcessor.processImage(buffer, {
      width: 1920,
      fit: 'inside'
    });

    return result.buffer;
  }

  /**
   * Pipeline step: Strip metadata
   */
  private async stripMetadata(buffer: Buffer, context: any): Promise<Buffer> {
    // In a real implementation, this would strip EXIF and other metadata
    // For now, return buffer as-is
    return buffer;
  }

  /**
   * Pipeline step: Optimize colors
   */
  private async optimizeColors(buffer: Buffer, context: any): Promise<Buffer> {
    // In a real implementation, this would optimize color palette and reduce colors
    // For now, return buffer as-is
    return buffer;
  }

  /**
   * Pipeline step: Apply compression
   */
  private async applyCompression(buffer: Buffer, context: any): Promise<Buffer> {
    // Apply format-specific compression settings
    const format = context.targetFormat || 'jpeg';
    const compression = this.config.compression[format as keyof typeof this.config.compression];

    if (compression) {
      const options: any = {
        format,
        quality: compression.quality
      };

      // Add format-specific options
      if (format === 'jpeg' && 'progressive' in compression && compression.progressive) {
        options.progressive = true;
      }

      const result = await this.imageProcessor.processImage(buffer, options);
      return result.buffer;
    }

    return buffer;
  }

  /**
   * Pipeline step: Enable progressive loading
   */
  private async enableProgressiveLoading(buffer: Buffer, context: any): Promise<Buffer> {
    // In a real implementation, this would enable progressive JPEG/WebP loading
    // For now, return buffer as-is
    return buffer;
  }

  /**
   * Pipeline step: Add watermark
   */
  private async addWatermark(buffer: Buffer, context: any): Promise<Buffer> {
    const result = await this.imageProcessor.processImage(buffer, {
      watermark: {
        text: 'SAMPLE',
        position: 'center',
        opacity: 0.3,
        margin: 10
      }
    });

    return result.buffer;
  }

  /**
   * Pipeline step: Resize to thumbnail
   */
  private async resizeToThumbnail(buffer: Buffer, context: any): Promise<Buffer> {
    const { width, height } = this.config.sizeVariants.thumbnail;

    const result = await this.imageProcessor.processImage(buffer, {
      width,
      height,
      fit: 'cover'
    });

    return result.buffer;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(
    success: boolean,
    originalSize: number,
    optimizedSize: number,
    processingTime: number,
    format: string
  ): void {
    this.metrics.totalOptimizations++;

    if (success) {
      this.metrics.successfulOptimizations++;
      this.metrics.totalOriginalSize += originalSize;
      this.metrics.totalOptimizedSize += optimizedSize;
    } else {
      this.metrics.failedOptimizations++;
    }

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalOptimizations - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalOptimizations;

    // Update average optimization ratio
    if (success && originalSize > 0) {
      const ratio = originalSize / optimizedSize;
      const totalRatio = this.metrics.averageOptimizationRatio * (this.metrics.successfulOptimizations - 1) + ratio;
      this.metrics.averageOptimizationRatio = totalRatio / this.metrics.successfulOptimizations;
    }

    // Update format usage
    const formatCount = this.metrics.formatUsage.get(format) || 0;
    this.metrics.formatUsage.set(format, formatCount + 1);
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    totalOptimizations: number;
    successfulOptimizations: number;
    failedOptimizations: number;
    successRate: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    averageOptimizationRatio: number;
    averageProcessingTime: number;
    formatUsage: Record<string, number>;
    timestamp: Date;
  } {
    const successRate = this.metrics.totalOptimizations > 0
      ? this.metrics.successfulOptimizations / this.metrics.totalOptimizations
      : 0;

    return {
      totalOptimizations: this.metrics.totalOptimizations,
      successfulOptimizations: this.metrics.successfulOptimizations,
      failedOptimizations: this.metrics.failedOptimizations,
      successRate,
      totalOriginalSize: this.metrics.totalOriginalSize,
      totalOptimizedSize: this.metrics.totalOptimizedSize,
      averageOptimizationRatio: this.metrics.averageOptimizationRatio,
      averageProcessingTime: this.metrics.averageProcessingTime,
      formatUsage: Object.fromEntries(this.metrics.formatUsage),
      timestamp: new Date()
    };
  }

  /**
   * Create custom optimization pipeline
   */
  createPipeline(pipeline: OptimizationPipeline): void {
    if (this.pipelines.has(pipeline.id)) {
      throw new Error(`Pipeline '${pipeline.id}' already exists`);
    }
    this.pipelines.set(pipeline.id, pipeline);
  }

  /**
   * Get available pipelines
   */
  getAvailablePipelines(): string[] {
    return Array.from(this.pipelines.keys());
  }

  /**
   * Remove pipeline
   */
  removePipeline(pipelineId: string): boolean {
    return this.pipelines.delete(pipelineId);
  }
}

/**
 * Image Optimization Factory
 */
export class ImageOptimizationFactory {
  private static instance: ImageOptimizationService | null = null;

  static create(
    config: Partial<ImageOptimizationConfig> = {},
    imageProcessor: SharpImageProvider,
    cdnProvider?: S3CDNProvider
  ): ImageOptimizationService {
    return new ImageOptimizationService(config, imageProcessor, cdnProvider);
  }

  static getInstance(): ImageOptimizationService | null {
    return this.instance;
  }

  static setInstance(service: ImageOptimizationService): void {
    if (this.instance) {
      throw new Error('Image optimization service instance already exists');
    }
    this.instance = service;
  }
}

/**
 * Image Format Utilities
 */
export class ImageFormatUtils {
  /**
   * Get optimal format for image characteristics
   */
  static getOptimalFormat(
    hasTransparency: boolean,
    quality: number,
    targetFormats: string[]
  ): string {
    if (hasTransparency) {
      return targetFormats.includes('webp') ? 'webp' : 'png';
    }

    if (quality > 90 && targetFormats.includes('avif')) {
      return 'avif';
    }

    if (targetFormats.includes('webp')) {
      return 'webp';
    }

    return 'jpeg';
  }

  /**
   * Calculate optimal quality setting
   */
  static calculateOptimalQuality(
    originalSize: number,
    targetSize: number,
    format: string
  ): number {
    const baseQuality = 85;
    const sizeRatio = targetSize / originalSize;

    // Adjust quality based on desired size reduction
    if (sizeRatio < 0.5) {
      return Math.max(70, baseQuality - 15);
    } else if (sizeRatio < 0.7) {
      return Math.max(75, baseQuality - 10);
    }

    return baseQuality;
  }

  /**
   * Estimate optimized file size
   */
  static estimateOptimizedSize(
    originalSize: number,
    dimensions: { width: number; height: number },
    format: string,
    quality: number
  ): number {
    // Simple estimation based on format and quality
    const formatMultipliers: Record<string, number> = {
      jpeg: 0.8,
      webp: 0.6,
      avif: 0.4,
      png: 1.2
    };

    const qualityMultiplier = quality / 100;
    const formatMultiplier = formatMultipliers[format] || 1;

    return Math.round(originalSize * formatMultiplier * qualityMultiplier);
  }

  /**
   * Validate image dimensions
   */
  static validateDimensions(
    width: number,
    height: number,
    maxWidth: number = 10000,
    maxHeight: number = 10000
  ): boolean {
    return width > 0 && height > 0 && width <= maxWidth && height <= maxHeight;
  }
}

/**
 * Image Optimization Error Types
 */
export class ImageOptimizationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly imageId?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ImageOptimizationError';
  }
}

export class ImageQualityThresholdError extends ImageOptimizationError {
  constructor(imageId: string, quality: number, threshold: number) {
    super(
      `Image quality ${quality} below threshold ${threshold}`,
      'QUALITY_THRESHOLD_NOT_MET',
      imageId,
      { quality, threshold }
    );
    this.name = 'ImageQualityThresholdError';
  }
}

export class ImageProcessingTimeoutError extends ImageOptimizationError {
  constructor(imageId: string, timeout: number) {
    super(
      `Image processing timed out after ${timeout}ms`,
      'PROCESSING_TIMEOUT',
      imageId,
      { timeout }
    );
    this.name = 'ImageProcessingTimeoutError';
  }
}

export class UnsupportedImageFormatError extends ImageOptimizationError {
  constructor(imageId: string, format: string) {
    super(
      `Unsupported image format: ${format}`,
      'UNSUPPORTED_FORMAT',
      imageId,
      { format }
    );
    this.name = 'UnsupportedImageFormatError';
  }
}
