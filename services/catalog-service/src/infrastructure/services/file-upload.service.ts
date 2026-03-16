/**
 * File Upload Service Implementation
 * Infrastructure layer multipart file handling and processing
 * Secure file uploads with validation, storage, and optimization
 */

import { Readable } from 'stream';
import { promises as fs } from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';
import { S3CDNProvider } from '../providers/cdn.provider';
import { SharpImageProvider } from '../providers/image-processing.provider';
import { getModelPrefix, makeId } from '@shared/ids/id';

/**
 * File Upload Configuration
 */
export interface FileUploadConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  tempDir: string;
  uploadTimeout: number; // milliseconds
  chunkSize: number; // bytes for streaming
  enableVirusScan?: boolean;
  enableCompression?: boolean;
  enableOptimization?: boolean;
  storageProvider: 'local' | 's3' | 'cdn';
  cdnConfig?: {
    bucket: string;
    region?: string;
    publicRead?: boolean;
  };
}

/**
 * Default File Upload Configuration
 */
export const DEFAULT_FILE_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/json'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.txt', '.json'],
  tempDir: '/tmp/uploads',
  uploadTimeout: 300000, // 5 minutes
  chunkSize: 64 * 1024, // 64KB
  enableVirusScan: false,
  enableCompression: true,
  enableOptimization: true,
  storageProvider: 'local'
};

/**
 * Uploaded File Metadata
 */
export interface UploadedFile {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimeType: string;
  size: number;
  buffer?: Buffer;
  stream?: Readable;
  tempPath?: string;
  hash?: string;
  metadata?: Record<string, any>;
}

/**
 * File Upload Result
 */
export interface FileUploadResult {
  success: boolean;
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  cdnUrl?: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  hash: string;
  uploadedAt: Date;
  processingTime: number;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Batch Upload Result
 */
export interface BatchUploadResult {
  results: FileUploadResult[];
  totalFiles: number;
  successful: number;
  failed: number;
  totalProcessingTime: number;
  errors: Array<{ fileName: string; error: string }>;
}

/**
 * File Processing Options
 */
export interface FileProcessingOptions {
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  optimizeImage?: boolean;
  imageQuality?: number;
  compressFile?: boolean;
  compressionLevel?: number;
  addWatermark?: boolean;
  watermarkText?: string;
  convertFormat?: 'jpeg' | 'png' | 'webp' | 'avif';
  resizeImage?: { width: number; height?: number; fit?: string };
}

/**
 * File Upload Service
 * Handles secure file uploads with validation and processing
 */
export class FileUploadService {
  private config: FileUploadConfig;
  private cdnProvider?: S3CDNProvider;
  private imageProcessor?: SharpImageProvider;
  private metrics = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalUploadSize: 0,
    averageProcessingTime: 0,
    uploadsByType: new Map<string, number>()
  };

  constructor(
    config: Partial<FileUploadConfig> = {},
    cdnProvider?: S3CDNProvider,
    imageProcessor?: SharpImageProvider
  ) {
    this.config = { ...DEFAULT_FILE_UPLOAD_CONFIG, ...config };
    this.cdnProvider = cdnProvider;
    this.imageProcessor = imageProcessor;
  }

  /**
   * Upload single file
   */
  async uploadFile(
    file: UploadedFile,
    options: FileProcessingOptions = {},
    customPath?: string
  ): Promise<FileUploadResult> {
    const startTime = Date.now();

    try {
      // Validate file
      this.validateFile(file);

      // Generate file ID and hash
      const fileId = this.generateFileId();
      const fileHash = await this.calculateFileHash(file);

      // Process file based on type and options
      const processedFile = await this.processFile(file, options);

      // Store file based on configured provider
      const storageResult = await this.storeFile(processedFile, fileId, customPath);

      // Update metrics
      this.updateMetrics(true, file.size, Date.now() - startTime, file.mimeType);

      return {
        success: true,
        fileId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: processedFile.size,
        url: storageResult.url,
        cdnUrl: storageResult.cdnUrl,
        optimizedUrl: storageResult.optimizedUrl,
        thumbnailUrl: storageResult.thumbnailUrl,
        hash: fileHash,
        uploadedAt: new Date(),
        processingTime: Date.now() - startTime,
        metadata: processedFile.metadata
      };
    } catch (error) {
      // Update metrics
      this.updateMetrics(false, file.size, Date.now() - startTime, file.mimeType);

      return {
        success: false,
        fileId: '',
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        hash: '',
        uploadedAt: new Date(),
        processingTime: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * Upload multiple files in batch
   */
  async uploadBatch(
    files: UploadedFile[],
    options: FileProcessingOptions & { concurrency?: number } = {}
  ): Promise<BatchUploadResult> {
    const concurrency = options.concurrency || 3;
    const startTime = Date.now();
    const results: FileUploadResult[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    // Process files in batches to control concurrency
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.uploadFile(file, options);
          results.push(result);
        } catch (error) {
          errors.push({
            fileName: file.originalName,
            error: (error as Error).message
          });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return {
      results,
      totalFiles: files.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length,
      totalProcessingTime: Date.now() - startTime,
      errors
    };
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: UploadedFile): void {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size ${this.config.maxFileSize}`);
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.mimeType)) {
      throw new Error(`MIME type ${file.mimeType} is not allowed`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.originalName);
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed`);
    }

    // Additional security checks
    if (file.originalName.includes('..') || file.originalName.includes('/')) {
      throw new Error('Invalid file name');
    }

    // Check for null bytes in filename (potential security issue)
    if (file.originalName.includes('\0')) {
      throw new Error('Invalid file name');
    }
  }

  /**
   * Process file based on type and options
   */
  private async processFile(
    file: UploadedFile,
    options: FileProcessingOptions
  ): Promise<{ buffer: Buffer; size: number; metadata?: Record<string, any> }> {
    let processedBuffer = file.buffer || Buffer.alloc(0);
    const metadata = file.metadata || {};

    // Handle image processing
    if (file.mimeType.startsWith('image/') && this.imageProcessor) {
      processedBuffer = await this.processImage(file, options, metadata);
    }

    // Apply compression if enabled
    if (this.config.enableCompression && options.compressFile) {
      processedBuffer = await this.compressFile(processedBuffer, options.compressionLevel);
    }

    return {
      buffer: processedBuffer,
      size: processedBuffer.length,
      metadata
    };
  }

  /**
   * Process image file
   */
  private async processImage(
    file: UploadedFile,
    options: FileProcessingOptions,
    metadata: Record<string, any>
  ): Promise<Buffer> {
    if (!this.imageProcessor || !file.buffer) {
      return file.buffer || Buffer.alloc(0);
    }

    const processingOptions: any = {};

    // Resize image
    if (options.resizeImage) {
      processingOptions.width = options.resizeImage.width;
      processingOptions.height = options.resizeImage.height;
      processingOptions.fit = options.resizeImage.fit || 'cover';
    }

    // Convert format
    if (options.convertFormat) {
      processingOptions.format = options.convertFormat;
    }

    // Set quality
    if (options.imageQuality) {
      processingOptions.quality = options.imageQuality;
    }

    // Add watermark
    if (options.addWatermark && options.watermarkText) {
      processingOptions.watermark = {
        text: options.watermarkText,
        position: 'bottom-right',
        opacity: 0.7
      };
    }

    const result = await this.imageProcessor.processImage(file.buffer, processingOptions);
    metadata.processed = true;
    metadata.originalSize = file.size;
    metadata.processedSize = result.size;
    metadata.dimensions = { width: result.width, height: result.height };

    return result.buffer;
  }

  /**
   * Store file based on configured provider
   */
  private async storeFile(
    file: { buffer: Buffer; size: number; metadata?: Record<string, any> },
    fileId: string,
    customPath?: string
  ): Promise<{
    url?: string;
    cdnUrl?: string;
    optimizedUrl?: string;
    thumbnailUrl?: string;
  }> {
    const fileName = `${fileId}_${Date.now()}`;
    const filePath = customPath ? `${customPath}/${fileName}` : fileName;

    switch (this.config.storageProvider) {
      case 's3':
      case 'cdn':
        if (this.cdnProvider) {
          const uploadResult = await this.cdnProvider.uploadFile(file.buffer, {
            key: filePath,
            contentType: file.metadata?.mimeType || 'application/octet-stream',
            metadata: file.metadata
          });

          return {
            url: uploadResult.url,
            cdnUrl: uploadResult.signedUrl || uploadResult.url
          };
        }
        // Fall through to local storage

      case 'local':
      default:
        const localPath = `/uploads/${filePath}`;
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, file.buffer);
        return {
          url: localPath
        };
    }
  }

  /**
   * Compress file
   */
  private async compressFile(buffer: Buffer, level?: number): Promise<Buffer> {
    return gzipSync(buffer, typeof level === 'number' ? { level } : undefined);
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return makeId(getModelPrefix('MediaRef'));
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(file: UploadedFile): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');

    if (file.buffer) {
      hash.update(file.buffer);
    } else if (file.stream) {
      // Hash stream content
      const chunks: Buffer[] = [];
      for await (const chunk of file.stream) {
        chunks.push(chunk);
      }
      const fullBuffer = Buffer.concat(chunks);
      hash.update(fullBuffer);
    }

    return hash.digest('hex');
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  /**
   * Update service metrics
   */
  private updateMetrics(
    success: boolean,
    fileSize: number,
    processingTime: number,
    mimeType: string
  ): void {
    this.metrics.totalUploads++;

    if (success) {
      this.metrics.successfulUploads++;
    } else {
      this.metrics.failedUploads++;
    }

    this.metrics.totalUploadSize += fileSize;

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalUploads - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalUploads;

    // Update type counts
    const typeCount = this.metrics.uploadsByType.get(mimeType) || 0;
    this.metrics.uploadsByType.set(mimeType, typeCount + 1);
  }

  /**
   * Get upload statistics
   */
  getStats(): {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    successRate: number;
    totalUploadSize: number;
    averageProcessingTime: number;
    uploadsByType: Record<string, number>;
    timestamp: Date;
  } {
    const successRate = this.metrics.totalUploads > 0
      ? this.metrics.successfulUploads / this.metrics.totalUploads
      : 0;

    return {
      totalUploads: this.metrics.totalUploads,
      successfulUploads: this.metrics.successfulUploads,
      failedUploads: this.metrics.failedUploads,
      successRate,
      totalUploadSize: this.metrics.totalUploadSize,
      averageProcessingTime: this.metrics.averageProcessingTime,
      uploadsByType: Object.fromEntries(this.metrics.uploadsByType),
      timestamp: new Date()
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(): Promise<void> {
    // In a real implementation, this would clean up temp files
    console.log('Cleaning up temporary files...');
  }

  /**
   * Validate file against security threats
   */
  async validateFileSecurity(file: UploadedFile): Promise<{ safe: boolean; threats?: string[] }> {
    // In a real implementation, this would integrate with virus scanning services
    if (this.config.enableVirusScan) {
      // Simulate virus scan
      await new Promise(resolve => setTimeout(resolve, 100));

      // For demo purposes, assume file is safe
      return { safe: true };
    }

    return { safe: true };
  }
}

/**
 * File Upload Factory
 */
export class FileUploadFactory {
  private static instance: FileUploadService | null = null;

  static create(
    config: Partial<FileUploadConfig> = {},
    cdnProvider?: S3CDNProvider,
    imageProcessor?: SharpImageProvider
  ): FileUploadService {
    return new FileUploadService(config, cdnProvider, imageProcessor);
  }

  static getInstance(): FileUploadService | null {
    return this.instance;
  }

  static setInstance(service: FileUploadService): void {
    if (this.instance) {
      throw new Error('File upload service instance already exists');
    }
    this.instance = service;
  }
}

/**
 * Multipart File Parser
 * Express middleware for parsing multipart/form-data
 */
export class MultipartFileParser {
  constructor(private uploadService: FileUploadService) {}

  /**
   * Express middleware for handling file uploads
   */
  middleware(options: {
    fieldName?: string;
    maxFiles?: number;
    fileSizeLimit?: number;
  } = {}) {
    return async (req: any, res: any, next: any) => {
      try {
        const files: UploadedFile[] = [];

        // In a real implementation, this would use multer or similar
        // For now, simulate file parsing from request
        if (req.files) {
          for (const fieldName in req.files) {
            const fileList = Array.isArray(req.files[fieldName])
              ? req.files[fieldName]
              : [req.files[fieldName]];

            for (const file of fileList) {
              files.push({
                fieldName,
                originalName: file.originalname || file.name,
                encoding: file.encoding,
                mimeType: file.mimetype,
                size: file.size,
                buffer: file.buffer,
                tempPath: file.tempFilePath || file.path
              });
            }
          }
        }

        // Validate file count
        if (options.maxFiles && files.length > options.maxFiles) {
          return res.status(400).json({
            error: `Too many files. Maximum allowed: ${options.maxFiles}`
          });
        }

        // Attach parsed files to request
        req.parsedFiles = files;
        next();
      } catch (error) {
        res.status(400).json({
          error: `File parsing failed: ${(error as Error).message}`
        });
      }
    };
  }

  /**
   * Process uploaded files from request
   */
  async processUploadedFiles(
    req: any,
    options: FileProcessingOptions = {}
  ): Promise<BatchUploadResult> {
    const files = req.parsedFiles || [];

    if (files.length === 0) {
      return {
        results: [],
        totalFiles: 0,
        successful: 0,
        failed: 0,
        totalProcessingTime: 0,
        errors: []
      };
    }

    return await this.uploadService.uploadBatch(files, options);
  }
}

/**
 * File Upload Error Types
 */
export class FileUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly fileName?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class FileSizeLimitError extends FileUploadError {
  constructor(fileName: string, size: number, limit: number) {
    super(
      `File ${fileName} size ${size} exceeds limit ${limit}`,
      'FILE_SIZE_LIMIT',
      fileName,
      { size, limit }
    );
    this.name = 'FileSizeLimitError';
  }
}

export class FileTypeNotAllowedError extends FileUploadError {
  constructor(fileName: string, mimeType: string) {
    super(
      `File type ${mimeType} not allowed for ${fileName}`,
      'FILE_TYPE_NOT_ALLOWED',
      fileName,
      { mimeType }
    );
    this.name = 'FileTypeNotAllowedError';
  }
}

export class FileSecurityError extends FileUploadError {
  constructor(fileName: string, threats: string[]) {
    super(
      `File ${fileName} failed security check`,
      'FILE_SECURITY_ERROR',
      fileName,
      { threats }
    );
    this.name = 'FileSecurityError';
  }
}

/**
 * File Upload Utilities
 */
export class FileUploadUtils {
  /**
   * Generate secure filename
   */
  static generateSecureFilename(originalName: string): string {
    const crypto = require('crypto');
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}${extension}`;
  }

  /**
   * Validate filename security
   */
  static isFilenameSecure(filename: string): boolean {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return false;
    }

    // Check for suspicious characters
    const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
    if (suspiciousChars.test(filename)) {
      return false;
    }

    return true;
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string | null {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };

    return mimeTypes[extension.toLowerCase()] || null;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
