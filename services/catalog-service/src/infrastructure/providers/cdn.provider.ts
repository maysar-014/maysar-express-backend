/**
 * CDN Provider Implementation
 * Infrastructure layer CDN integrations for file storage and delivery
 * AWS S3 and CloudFlare R2 support with circuit breaker and monitoring
 */

import { CircuitBreaker, RetryPolicy, ProviderManager } from './index';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { Readable } from 'stream';

/**
 * CDN Provider Types
 */
export enum CDNProvider {
  AWS_S3 = 'aws_s3',
  CLOUDFLARE_R2 = 'cloudflare_r2',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  AZURE_BLOB_STORAGE = 'azure_blob_storage',
  DIGITALOCEAN_SPACES = 'digitalocean_spaces'
}

/**
 * CDN Configuration
 */
export interface CDNConfig {
  provider: CDNProvider;
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicRead?: boolean;
  signedUrls?: boolean;
  signedUrlExpiry?: number; // seconds
  cdnDomain?: string;
  timeout: number;
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  cacheControl?: string;
  metadata?: Record<string, string>;
}

/**
 * File Upload Options
 */
export interface FileUploadOptions {
  key: string;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'public-read-write';
  tags?: Record<string, string>;
  expires?: Date;
}

/**
 * File Upload Result
 */
export interface FileUploadResult {
  key: string;
  url: string;
  signedUrl?: string;
  etag: string;
  size: number;
  uploadTime: number;
  timestamp: Date;
}

/**
 * File Download Options
 */
export interface FileDownloadOptions {
  key: string;
  range?: { start: number; end: number };
  expires?: number; // seconds for signed URLs
}

/**
 * File Download Result
 */
export interface FileDownloadResult {
  buffer: Buffer;
  contentType: string;
  size: number;
  lastModified: Date;
  etag: string;
  downloadTime: number;
}

/**
 * File List Options
 */
export interface FileListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

/**
 * File List Result
 */
export interface FileListResult {
  files: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  commonPrefixes: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  listTime: number;
}

/**
 * AWS S3 CDN Provider
 */
export class S3CDNProvider {
  private config: CDNConfig;
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;
  private s3Client?: any;
  private metrics = {
    uploads: 0,
    downloads: 0,
    deletes: 0,
    lists: 0,
    errors: 0,
    totalUploadTime: 0,
    totalDownloadTime: 0,
    averageUploadTime: 0,
    averageDownloadTime: 0
  };

  constructor(config: CDNConfig) {
    this.config = config;
    this.circuitBreaker = ProviderManager.getInstance().getCircuitBreaker('cdn');
    this.retryPolicy = ProviderManager.getInstance().getRetryPolicy('cdn');
    this.initializeS3Client();
  }

  /**
   * Upload file to CDN
   */
  async uploadFile(
    buffer: Buffer,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    this.validateUpload(buffer, options);

    return await this.executeWithResilience(async () => {
      const startTime = Date.now();

      try {
        const result = await this.s3Client.send(new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: options.key,
          Body: buffer,
          ContentType: options.contentType,
          CacheControl: options.cacheControl || this.config.cacheControl,
          Metadata: { ...this.config.metadata, ...options.metadata },
          ACL: options.acl || (this.config.publicRead ? 'public-read' : 'private'),
          Tagging: options.tags ? this.encodeTags(options.tags) : undefined,
          Expires: options.expires
        }));

        const uploadTime = Date.now() - startTime;
        const location = this.config.cdnDomain
          ? `https://${this.config.cdnDomain}/${options.key}`
          : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${options.key}`;
        const etag = result.ETag || `"${this.generateETag(buffer)}"`;

        this.recordMetrics('upload', uploadTime);

        const fileResult: FileUploadResult = {
          key: options.key,
          url: location,
          etag,
          size: buffer.length,
          uploadTime,
          timestamp: new Date()
        };

        // Generate signed URL if configured
        if (this.config.signedUrls) {
          fileResult.signedUrl = await this.generateSignedUrl(options.key, this.config.signedUrlExpiry || 3600);
        }

        return fileResult;
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    });
  }

  /**
   * Download file from CDN
   */
  async downloadFile(options: FileDownloadOptions): Promise<FileDownloadResult> {
    return await this.executeWithResilience(async () => {
      const startTime = Date.now();

      try {
        const result = await this.s3Client.send(new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: options.key,
          Range: options.range ? `bytes=${options.range.start}-${options.range.end}` : undefined
        }));

        const bodyStream = result.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of bodyStream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        const downloadTime = Date.now() - startTime;

        this.recordMetrics('download', downloadTime);

        return {
          buffer,
          contentType: result.ContentType || 'application/octet-stream',
          size: Number(result.ContentLength || buffer.length),
          lastModified: result.LastModified || new Date(),
          etag: result.ETag || `"${this.generateETag(buffer)}"`,
          downloadTime
        };
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    });
  }

  /**
   * Delete file from CDN
   */
  async deleteFile(key: string): Promise<void> {
    return await this.executeWithResilience(async () => {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        }));
        this.recordMetrics('delete', 0);
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    });
  }

  /**
   * List files in CDN
   */
  async listFiles(options: FileListOptions = {}): Promise<FileListResult> {
    return await this.executeWithResilience(async () => {
      const startTime = Date.now();

      try {
        const result = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: options.prefix,
          Delimiter: options.delimiter,
          MaxKeys: options.maxKeys || 1000,
          ContinuationToken: options.continuationToken
        }));

        const listTime = Date.now() - startTime;

        this.recordMetrics('list', listTime);

        return {
          files: result.Contents?.map(item => ({
            key: item.Key!,
            size: item.Size!,
            lastModified: item.LastModified!,
            etag: item.ETag!
          })) || [],
          commonPrefixes: result.CommonPrefixes?.map((cp: any) => cp.Prefix || cp) || [],
          isTruncated: result.IsTruncated || false,
          nextContinuationToken: result.NextContinuationToken,
          listTime
        };
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    });
  }

  /**
   * Generate signed URL for private file access
   */
  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      }),
      { expiresIn }
    );
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    return await this.executeWithResilience(async () => {
      try {
        await this.s3Client.send(new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        }));
        return true; // Simulate file exists
      } catch (error) {
        if ((error as any)?.name === 'NotFound' || (error as any)?.$metadata?.httpStatusCode === 404) {
          return false;
        }
        throw error;
      }
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata: Record<string, string>;
  }> {
    return await this.executeWithResilience(async () => {
      const result = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      }));

      return {
        size: Number(result.ContentLength || 0),
        contentType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        etag: result.ETag || '',
        metadata: (result.Metadata || {}) as Record<string, string>
      };
    });
  }

  /**
   * Copy file within CDN
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    return await this.executeWithResilience(async () => {
      try {
        await this.s3Client.send(new CopyObjectCommand({
          Bucket: this.config.bucket,
          CopySource: `${this.config.bucket}/${sourceKey}`,
          Key: destinationKey
        }));
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    });
  }

  /**
   * Execute operation with resilience (circuit breaker + retry)
   */
  private async executeWithResilience<T>(operation: () => Promise<T>): Promise<T> {
    return await ProviderManager.getInstance().executeWithResilience(
      'cdn',
      operation
    );
  }

  /**
   * Validate file upload
   */
  private validateUpload(buffer: Buffer, options: FileUploadOptions): void {
    // Check file size
    if (buffer.length > this.config.maxFileSize) {
      throw new Error(`File size ${buffer.length} exceeds maximum allowed size ${this.config.maxFileSize}`);
    }

    // Check MIME type
    if (options.contentType && !this.config.allowedMimeTypes.includes(options.contentType)) {
      throw new Error(`MIME type ${options.contentType} is not allowed`);
    }

    // Validate key format (prevent directory traversal)
    if (options.key.includes('..') || options.key.startsWith('/')) {
      throw new Error('Invalid file key');
    }
  }

  /**
   * Generate ETag for file
   */
  private generateETag(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Encode tags for S3
   */
  private encodeTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Record operation metrics
   */
  private recordMetrics(operation: string, duration: number): void {
    switch (operation) {
      case 'upload':
        this.metrics.uploads++;
        this.metrics.totalUploadTime += duration;
        this.metrics.averageUploadTime = this.metrics.totalUploadTime / this.metrics.uploads;
        break;
      case 'download':
        this.metrics.downloads++;
        this.metrics.totalDownloadTime += duration;
        this.metrics.averageDownloadTime = this.metrics.totalDownloadTime / this.metrics.downloads;
        break;
      case 'delete':
        this.metrics.deletes++;
        break;
      case 'list':
        this.metrics.lists++;
        break;
    }
  }

  /**
   * Initialize S3 client
   */
  private initializeS3Client(): void {
    try {
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId!,
          secretAccessKey: this.config.secretAccessKey!
        },
        endpoint: this.config.endpoint
      });
      console.log('S3 CDN client initialized');
    } catch (error) {
      console.error('Failed to initialize S3 CDN client:', error);
    }
  }

  /**
   * Get CDN metrics
   */
  getMetrics(): {
    uploads: number;
    downloads: number;
    deletes: number;
    lists: number;
    errors: number;
    averageUploadTime: number;
    averageDownloadTime: number;
    timestamp: Date;
  } {
    return {
      ...this.metrics,
      timestamp: new Date()
    };
  }
}

/**
 * CDN Provider Factory
 */
export class CDNProviderFactory {
  private static instance: S3CDNProvider | null = null;

  static createS3(config: CDNConfig): S3CDNProvider {
    return new S3CDNProvider(config);
  }

  static createCloudFlareR2(config: CDNConfig): S3CDNProvider {
    // CloudFlare R2 uses S3-compatible API
    return new S3CDNProvider({
      ...config,
      provider: CDNProvider.CLOUDFLARE_R2,
      endpoint: `https://${config.accessKeyId}.r2.cloudflarestorage.com`
    });
  }

  static createDefault(config: CDNConfig): S3CDNProvider {
    const provider = config.provider || CDNProvider.AWS_S3;

    switch (provider) {
      case CDNProvider.AWS_S3:
        return this.createS3(config);
      case CDNProvider.CLOUDFLARE_R2:
        return this.createCloudFlareR2(config);
      default:
        return this.createS3(config);
    }
  }

  static getInstance(): S3CDNProvider | null {
    return this.instance;
  }

  static setInstance(provider: S3CDNProvider): void {
    if (this.instance) {
      throw new Error('CDN provider instance already exists');
    }
    this.instance = provider;
  }
}

/**
 * CDN Health Monitor
 */
export class CDNHealthMonitor {
  constructor(private provider: S3CDNProvider) {}

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    uploadsToday: number;
    downloadsToday: number;
    errorRate: number;
    availableSpace?: number;
  }> {
    try {
      const startTime = Date.now();

      // Test basic connectivity by listing files
      await this.provider.listFiles({ maxKeys: 1 });
      const responseTime = Date.now() - startTime;

      const metrics = this.provider.getMetrics();
      const totalOperations = metrics.uploads + metrics.downloads + metrics.deletes + metrics.lists;
      const errorRate = totalOperations > 0 ? metrics.errors / totalOperations : 0;

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
        uploadsToday: metrics.uploads,
        downloadsToday: metrics.downloads,
        errorRate,
        availableSpace: undefined // Would need to check bucket metrics
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: -1,
        uploadsToday: 0,
        downloadsToday: 0,
        errorRate: 1
      };
    }
  }
}

/**
 * Batch File Operations
 */
export class BatchFileOperations {
  constructor(private cdnProvider: S3CDNProvider) {}

  /**
   * Upload multiple files in parallel
   */
  async uploadBatch(
    files: Array<{ buffer: Buffer; options: FileUploadOptions }>,
    options: { concurrency?: number; continueOnError?: boolean } = {}
  ): Promise<{
    results: FileUploadResult[];
    errors: Array<{ index: number; error: string }>;
    totalTime: number;
  }> {
    const concurrency = options.concurrency || 5;
    const startTime = Date.now();
    const results: FileUploadResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.cdnProvider.uploadFile(file.buffer, file.options);
          results[globalIndex] = result;
        } catch (error) {
          const errorMsg = (error as Error).message;
          errors.push({ index: globalIndex, error: errorMsg });

          if (!options.continueOnError) {
            throw error;
          }
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return {
      results: results.filter(Boolean),
      errors,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Delete multiple files
   */
  async deleteBatch(
    keys: string[],
    options: { continueOnError?: boolean } = {}
  ): Promise<{
    deleted: string[];
    errors: Array<{ key: string; error: string }>;
    totalTime: number;
  }> {
    const startTime = Date.now();
    const deleted: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const key of keys) {
      try {
        await this.cdnProvider.deleteFile(key);
        deleted.push(key);
      } catch (error) {
        const errorMsg = (error as Error).message;
        errors.push({ key, error: errorMsg });

        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    return {
      deleted,
      errors,
      totalTime: Date.now() - startTime
    };
  }
}

/**
 * CDN Cache Management
 */
export class CDNCacheManager {
  constructor(private cdnProvider: S3CDNProvider) {}

  /**
   * Invalidate CDN cache (CloudFlare integration)
   */
  async invalidateCache(urls: string[]): Promise<void> {
    const config = (this.cdnProvider as any).config as CDNConfig;
    if (!config || !config.accessKeyId || !config.secretAccessKey) {
      console.log(`Invalidating cache for ${urls.length} URLs`);
      return;
    }

    const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
    if (!distributionId) {
      console.log(`Invalidating cache for ${urls.length} URLs`);
      return;
    }

    const client = new CloudFrontClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    const paths = urls.map((url) => {
      try {
        const parsed = new URL(url);
        return parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
      } catch {
        return url.startsWith('/') ? url : `/${url}`;
      }
    });

    await client.send(new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths
        }
      }
    }));
  }

  /**
   * Purge entire CDN cache
   */
  async purgeCache(): Promise<void> {
    // In a real implementation, this would purge the entire CDN cache
    console.log('Purging entire CDN cache');
  }

  /**
   * Set cache control headers for file
   */
  async setCacheControl(key: string, cacheControl: string): Promise<void> {
    // In a real implementation, this would update the object's cache control
    console.log(`Setting cache control for ${key}: ${cacheControl}`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    cacheHitRate?: number;
    totalRequests?: number;
    bandwidthUsed?: number;
  }> {
    // In a real implementation, this would fetch CDN analytics
    return {
      cacheHitRate: undefined,
      totalRequests: undefined,
      bandwidthUsed: undefined
    };
  }
}
