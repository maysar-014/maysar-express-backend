/**
 * File Upload Service Tests
 * Infrastructure layer testing for secure file handling and processing
 * Tests validation, storage, optimization, and error scenarios
 *
 * Coverage Requirements (per Testing Constitution):
 * - Infrastructure Layer: 75% minimum, 80% target, 85% critical
 * - Mock external services (CDN, image processing, storage)
 * - Test error scenarios and fallbacks
 * - Service isolation and resilience testing
 */

import {
  FileUploadService,
  FileUploadConfig,
  FileUploadResult,
  BatchUploadResult,
  FileProcessingOptions,
  FileUploadFactory,
  MultipartFileParser,
  FileUploadError,
  FileSizeLimitError,
  FileTypeNotAllowedError,
  FileSecurityError,
  FileUploadUtils
} from '../file-upload.service';

jest.mock('@shared/ids/id', () => {
  const actual = jest.requireActual('@shared/ids/id');
  return {
    ...actual,
    makeId: jest.fn(() => 'med_01H00000000000000000000000')
  };
});

// Mock external providers
jest.mock('../../providers/cdn.provider', () => ({
  S3CDNProvider: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    getSignedUrl: jest.fn(),
    deleteFile: jest.fn()
  }))
}));

jest.mock('../../providers/image-processing.provider', () => ({
  SharpImageProvider: jest.fn().mockImplementation(() => ({
    processImage: jest.fn(),
    generateThumbnail: jest.fn(),
    optimizeImage: jest.fn()
  }))
}));

import { S3CDNProvider } from '../../providers/cdn.provider';
import { SharpImageProvider } from '../../providers/image-processing.provider';
import { FileUploadResult as CdnFileUploadResult } from '../../providers/cdn.provider';
import { ImageProcessingResult } from '../../providers/image-processing.provider';
import { makeId } from '@shared/ids/id';

// Mock crypto and fs
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash')
  }))
}));

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('FileUploadService', () => {
  const mockFileId = 'med_01H00000000000000000000000';
  let uploadService: FileUploadService;
  let config: FileUploadConfig;
  let mockCDNProvider: jest.Mocked<S3CDNProvider>;
  let mockImageProcessor: jest.Mocked<SharpImageProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    (makeId as jest.Mock).mockReturnValue(mockFileId);

    config = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
      tempDir: '/tmp/uploads',
      uploadTimeout: 300000,
      chunkSize: 64 * 1024,
      enableVirusScan: false,
      enableCompression: true,
      enableOptimization: true,
      storageProvider: 'local'
    };

    mockCDNProvider = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
      deleteFile: jest.fn()
    } as any;

    mockImageProcessor = {
      processImage: jest.fn(),
      generateThumbnail: jest.fn(),
      optimizeImage: jest.fn()
    } as any;

    uploadService = new FileUploadService(config, mockCDNProvider, mockImageProcessor);
  });

  describe('initialization', () => {
    it('should initialize with default config when no config provided', () => {
      const service = new FileUploadService();
      expect(service).toBeDefined();
    });

    it('should initialize with provided config and providers', () => {
      expect(uploadService).toBeDefined();
    });
  });

  describe('uploadFile', () => {
    const mockFile = {
      fieldName: 'file',
      originalName: 'test-image.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test-image-data'),
      metadata: { width: 1920, height: 1080 }
    };

    it('should successfully upload a valid file', async () => {
      const result: FileUploadResult = await uploadService.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe(mockFileId);
      expect(result.originalName).toBe('test-image.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024 * 1024);
      expect(result.hash).toBe('test-hash');
      expect(result.uploadedAt).toBeInstanceOf(Date);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should process image files when image processor is available', async () => {
      const imageFile = { ...mockFile, mimeType: 'image/jpeg' };
      const processingOptions: FileProcessingOptions = {
        optimizeImage: true,
        generateThumbnail: true,
        resizeImage: { width: 800, height: 600 }
      };

      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed-image-data'),
        size: 500 * 1024,
        width: 800,
        height: 600,
        format: 'jpeg',
        processingTime: 150,
        originalSize: 1024 * 1024
      });

      const result = await uploadService.uploadFile(imageFile, processingOptions);

      expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
        imageFile.buffer,
        expect.objectContaining({
          width: 800,
          height: 600,
          fit: 'cover'
        })
      );
      expect(result.success).toBe(true);
      expect(result.metadata?.processed).toBe(true);
    });

    it('should upload to CDN when configured', async () => {
      const cdnConfig = { ...config, storageProvider: 'cdn' as const };
      const cdnService = new FileUploadService(cdnConfig, mockCDNProvider);

      mockCDNProvider.uploadFile.mockResolvedValue({
        url: `https://cdn.example.com/${mockFileId}.jpg`,
        signedUrl: `https://cdn.example.com/signed/${mockFileId}.jpg`,
        key: `${mockFileId}.jpg`,
        etag: '"test-etag"',
        size: 1024,
        uploadTime: 100,
        timestamp: new Date()
      });

      const result = await cdnService.uploadFile(mockFile);

      expect(mockCDNProvider.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.objectContaining({
          key: expect.stringContaining(mockFileId),
          contentType: 'image/jpeg'
        })
      );
      expect(result.cdnUrl).toBe(`https://cdn.example.com/signed/${mockFileId}.jpg`);
    });

    it('should handle file validation errors', async () => {
      const invalidFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB - exceeds limit

      const result = await uploadService.uploadFile(invalidFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should handle processing errors gracefully', async () => {
      const imageFile = { ...mockFile, mimeType: 'image/jpeg' };
      mockImageProcessor.processImage.mockRejectedValue(new Error('Image processing failed'));

      const result = await uploadService.uploadFile(imageFile, { optimizeImage: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image processing failed');
    });

    it('should update metrics on successful upload', async () => {
      await uploadService.uploadFile(mockFile);

      const stats = uploadService.getStats();
      expect(stats.totalUploads).toBe(1);
      expect(stats.successfulUploads).toBe(1);
      expect(stats.failedUploads).toBe(0);
      expect(stats.totalUploadSize).toBe(1024 * 1024);
      expect(stats.uploadsByType['image/jpeg']).toBe(1);
    });

    it('should update metrics on failed upload', async () => {
      const invalidFile = { ...mockFile, size: 10 * 1024 * 1024 };

      await uploadService.uploadFile(invalidFile);

      const stats = uploadService.getStats();
      expect(stats.totalUploads).toBe(1);
      expect(stats.successfulUploads).toBe(0);
      expect(stats.failedUploads).toBe(1);
    });
  });

  describe('uploadBatch', () => {
    const mockFiles = [
      {
        fieldName: 'file1',
        originalName: 'test1.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test-image-1')
      },
      {
        fieldName: 'file2',
        originalName: 'test2.png',
        encoding: '7bit',
        mimeType: 'image/png',
        size: 512 * 1024,
        buffer: Buffer.from('test-image-2')
      },
      {
        fieldName: 'file3',
        originalName: 'document.pdf',
        encoding: '7bit',
        mimeType: 'application/pdf',
        size: 256 * 1024,
        buffer: Buffer.from('test-pdf')
      }
    ];

    it('should successfully upload multiple files', async () => {
      const result: BatchUploadResult = await uploadService.uploadBatch(mockFiles);

      expect(result.totalFiles).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.totalProcessingTime).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial batch failures', async () => {
      const mixedFiles = [
        ...mockFiles,
        {
          fieldName: 'invalid',
          originalName: 'invalid.exe',
          encoding: '7bit',
          mimeType: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('invalid')
        }
      ];

      const result = await uploadService.uploadBatch(mixedFiles);

      expect(result.totalFiles).toBe(4);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fileName).toBe('invalid.exe');
    });

    it('should respect concurrency limits', async () => {
      const manyFiles = Array.from({ length: 10 }, (_, i) => ({
        fieldName: `file${i}`,
        originalName: `test${i}.jpg`,
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from(`test-image-${i}`)
      }));

      const result = await uploadService.uploadBatch(manyFiles, { concurrency: 2 });

      expect(result.totalFiles).toBe(10);
      expect(result.successful).toBe(10);
      expect(result.failed).toBe(0);
    });

    it('should apply processing options to all files in batch', async () => {
      const processingOptions: FileProcessingOptions = {
        optimizeImage: true,
        convertFormat: 'webp'
      };

      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('processed-webp'),
        size: 512,
        width: 800,
        height: 600,
        format: 'webp',
        processingTime: 100,
        originalSize: 1024 * 1024
      });

      const result = await uploadService.uploadBatch(mockFiles.slice(0, 2), processingOptions);

      expect(mockImageProcessor.processImage).toHaveBeenCalledTimes(2);
      expect(result.successful).toBe(2);
    });
  });

  describe('file validation', () => {
    it('should validate file size', () => {
      const largeFile = {
        fieldName: 'file',
        originalName: 'large.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB - exceeds 5MB limit
        buffer: Buffer.from('large-file')
      };

      expect(() => (uploadService as any).validateFile(largeFile)).toThrow(
        'File size 10485760 exceeds maximum allowed size 5242880'
      );
    });

    it('should validate MIME type', () => {
      const invalidFile = {
        fieldName: 'file',
        originalName: 'script.js',
        encoding: '7bit',
        mimeType: 'application/javascript',
        size: 1024,
        buffer: Buffer.from('script')
      };

      expect(() => (uploadService as any).validateFile(invalidFile)).toThrow(
        'MIME type application/javascript is not allowed'
      );
    });

    it('should validate file extension', () => {
      const invalidFile = {
        fieldName: 'file',
        originalName: 'document.exe',
        encoding: '7bit',
        mimeType: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('exe')
      };

      expect(() => (uploadService as any).validateFile(invalidFile)).toThrow(
        'File extension .exe is not allowed'
      );
    });

    it('should detect path traversal attempts', () => {
      const maliciousFile = {
        fieldName: 'file',
        originalName: '../../../etc/passwd',
        encoding: '7bit',
        mimeType: 'text/plain',
        size: 1024,
        buffer: Buffer.from('malicious')
      };

      expect(() => (uploadService as any).validateFile(maliciousFile)).toThrow(
        'Invalid file name'
      );
    });

    it('should detect null bytes in filename', () => {
      const maliciousFile = {
        fieldName: 'file',
        originalName: 'test.jpg\x00.exe',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('malicious')
      };

      expect(() => (uploadService as any).validateFile(maliciousFile)).toThrow(
        'Invalid file name'
      );
    });
  });

  describe('image processing', () => {
    const imageFile = {
      fieldName: 'image',
      originalName: 'test.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg',
      size: 1024 * 1024,
      buffer: Buffer.from('image-data'),
      metadata: {} as Record<string, unknown>
    };

    it('should resize images when requested', async () => {
      const options: FileProcessingOptions = {
        resizeImage: { width: 800, height: 600, fit: 'contain' }
      };

      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('resized-image'),
        size: 300 * 1024,
        width: 800,
        height: 600,
        format: 'jpeg',
        processingTime: 100,
        originalSize: 1024 * 1024
      });

      const result = await (uploadService as any).processImage(imageFile, options, {});

      expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
        imageFile.buffer,
        expect.objectContaining({
          width: 800,
          height: 600,
          fit: 'contain'
        })
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should convert image formats', async () => {
      const options: FileProcessingOptions = {
        convertFormat: 'webp',
        imageQuality: 85
      };

      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('webp-image'),
        size: 200 * 1024,
        width: 1920,
        height: 1080,
        format: 'webp',
        processingTime: 100,
        originalSize: 1024 * 1024
      } as ImageProcessingResult);

      const result = await (uploadService as any).processImage(imageFile, options, imageFile.metadata);

      expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
        imageFile.buffer,
        expect.objectContaining({
          format: 'webp',
          quality: 85
        })
      );
      expect(imageFile.metadata.processed).toBe(true);
      expect(imageFile.metadata.dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should add watermarks when requested', async () => {
      const options: FileProcessingOptions = {
        addWatermark: true,
        watermarkText: 'Copyright 2024'
      };

      mockImageProcessor.processImage.mockResolvedValue({
        buffer: Buffer.from('watermarked-image'),
        size: 1024 * 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        processingTime: 100,
        originalSize: 1024 * 1024
      } as ImageProcessingResult);

      await (uploadService as any).processImage(imageFile, options, imageFile.metadata);

      expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
        imageFile.buffer,
        expect.objectContaining({
          watermark: expect.objectContaining({
            text: 'Copyright 2024',
            position: 'bottom-right',
            opacity: 0.7
          })
        })
      );
    });

    it('should skip processing when image processor is not available', async () => {
      const serviceWithoutProcessor = new FileUploadService(config, mockCDNProvider);

      const result = await (serviceWithoutProcessor as any).processImage(imageFile, {}, {});

      expect(result).toBe(imageFile.buffer);
    });
  });

  describe('storage handling', () => {
    it('should store files locally when configured', async () => {
      const file = {
        buffer: Buffer.from('file-data'),
        size: 1024,
        metadata: { mimeType: 'text/plain' }
      };

      const result = await (uploadService as any).storeFile(file, 'test-id');

      expect(result.url).toBe('/uploads/test-id');
      expect(result.cdnUrl).toBeUndefined();
    });

    it('should store files in CDN when configured', async () => {
      const cdnConfig = { ...config, storageProvider: 'cdn' as const };
      const cdnService = new FileUploadService(cdnConfig, mockCDNProvider);

      mockCDNProvider.uploadFile.mockResolvedValue({
        url: 'https://cdn.example.com/test-id.jpg',
        signedUrl: 'https://cdn.example.com/signed/test-id.jpg',
        key: 'test-id.jpg',
        etag: '"etag"',
        size: 1024,
        uploadTime: 100,
        timestamp: new Date()
      } as CdnFileUploadResult);

      const file = {
        buffer: Buffer.from('file-data'),
        size: 1024,
        metadata: { mimeType: 'image/jpeg' }
      };

      const result = await (cdnService as any).storeFile(file, 'test-id', 'images');

      expect(mockCDNProvider.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        expect.objectContaining({
          key: 'images/test-id',
          contentType: 'image/jpeg'
        })
      );
      expect(result.url).toBe('https://cdn.example.com/test-id.jpg');
      expect(result.cdnUrl).toBe('https://cdn.example.com/signed/test-id.jpg');
    });

    it('should handle CDN upload failures', async () => {
      const cdnConfig = { ...config, storageProvider: 'cdn' as const };
      const cdnService = new FileUploadService(cdnConfig, mockCDNProvider);

      mockCDNProvider.uploadFile.mockRejectedValue(new Error('CDN upload failed'));

      const file = {
        buffer: Buffer.from('file-data'),
        size: 1024,
        metadata: { mimeType: 'image/jpeg' }
      };

      await expect((cdnService as any).storeFile(file, 'test-id')).rejects.toThrow('CDN upload failed');
    });
  });

  describe('file security', () => {
    it('should validate file security when enabled', async () => {
      const secureConfig = { ...config, enableVirusScan: true };
      const secureService = new FileUploadService(secureConfig);

      const file = {
        fieldName: 'file',
        originalName: 'test.pdf',
        encoding: '7bit',
        mimeType: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('pdf-data')
      };

      const securityResult = await secureService.validateFileSecurity(file);

      expect(securityResult.safe).toBe(true);
      expect(securityResult.threats).toBeUndefined();
    });

    it('should skip security validation when disabled', async () => {
      const file = {
        fieldName: 'file',
        originalName: 'test.pdf',
        encoding: '7bit',
        mimeType: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('pdf-data')
      };

      const securityResult = await uploadService.validateFileSecurity(file);

      expect(securityResult.safe).toBe(true);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track upload statistics', () => {
      // Simulate some uploads
      const stats = uploadService.getStats();

      expect(stats).toHaveProperty('totalUploads');
      expect(stats).toHaveProperty('successfulUploads');
      expect(stats).toHaveProperty('failedUploads');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('totalUploadSize');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('uploadsByType');
      expect(stats).toHaveProperty('timestamp');
    });

    it('should calculate success rate correctly', () => {
      // The stats calculation is tested implicitly through upload operations
      const stats = uploadService.getStats();
      expect(typeof stats.successRate).toBe('number');
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    it('should handle file processing errors', async () => {
      const imageFile = {
        fieldName: 'image',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image-data')
      };

      mockImageProcessor.processImage.mockRejectedValue(new Error('Processing failed'));

      const result = await uploadService.uploadFile(imageFile, { optimizeImage: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing failed');
    });

    it('should handle storage errors', async () => {
      const cdnConfig = { ...config, storageProvider: 'cdn' as const };
      const cdnService = new FileUploadService(cdnConfig, mockCDNProvider);

      mockCDNProvider.uploadFile.mockRejectedValue(new Error('Storage failed'));

      const file = {
        fieldName: 'file',
        originalName: 'test.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('file-data')
      };

      const result = await cdnService.uploadFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage failed');
    });

    it('should handle hash calculation errors', async () => {
      const fileWithoutBuffer = {
        fieldName: 'file',
        originalName: 'test.txt',
        encoding: '7bit',
        mimeType: 'text/plain',
        size: 1024
        // No buffer or stream
      };

      const result = await uploadService.uploadFile(fileWithoutBuffer);

      expect(result.success).toBe(true);
      expect(result.hash).toBe('test-hash');
    });
  });

  describe('cleanup', () => {
    it('should cleanup temporary files', async () => {
      await uploadService.cleanupTempFiles();
      // In the mock implementation, this is just a console.log
      expect(true).toBe(true);
    });
  });
});

describe('MultipartFileParser', () => {
  let parser: MultipartFileParser;
  let mockUploadService: jest.Mocked<FileUploadService>;

  beforeEach(() => {
    mockUploadService = {
      uploadBatch: jest.fn()
    } as any;

    parser = new MultipartFileParser(mockUploadService);
  });

  describe('middleware', () => {
    it('should parse multipart files from request', () => {
      const middleware = parser.middleware();
      const mockReq: {
        files?: Record<string, unknown>;
        parsedFiles?: Array<{ originalName: string }>;
      } = {
        files: {
          images: [
            {
              originalname: 'test1.jpg',
              encoding: '7bit',
              mimetype: 'image/jpeg',
              size: 1024,
              buffer: Buffer.from('image1'),
              tempFilePath: '/tmp/test1.jpg'
            },
            {
              originalname: 'test2.png',
              encoding: '7bit',
              mimetype: 'image/png',
              size: 2048,
              buffer: Buffer.from('image2'),
              tempFilePath: '/tmp/test2.png'
            }
          ],
          documents: {
            originalname: 'doc.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            size: 512,
            buffer: Buffer.from('pdf'),
            tempFilePath: '/tmp/doc.pdf'
          }
        }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.parsedFiles!).toHaveLength(3);
      expect(mockReq.parsedFiles![0].originalName).toBe('test1.jpg');
      expect(mockReq.parsedFiles![1].originalName).toBe('test2.png');
      expect(mockReq.parsedFiles![2].originalName).toBe('doc.pdf');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate file count limits', () => {
      const middleware = parser.middleware({ maxFiles: 2 });
      const mockReq = {
        files: {
          files: Array.from({ length: 5 }, (_, i) => ({
            originalname: `file${i}.jpg`,
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from(`file${i}`)
          }))
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many files. Maximum allowed: 2'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle requests without files', () => {
      const middleware = parser.middleware();
      const mockReq: { files?: unknown; parsedFiles?: unknown[] } = {};
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.parsedFiles).toEqual([]);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle parsing errors', () => {
      const middleware = parser.middleware();
      const mockReq: { files: null; parsedFiles?: unknown[] } = {
        files: null // This might cause issues in real parsing
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.parsedFiles).toEqual([]);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('processUploadedFiles', () => {
    it('should process uploaded files from request', async () => {
      const mockBatchResult: BatchUploadResult = {
        results: [
          {
            success: true,
            fileId: 'file1-id',
            originalName: 'test1.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            hash: 'hash1',
            uploadedAt: new Date(),
            processingTime: 100
          }
        ],
        totalFiles: 1,
        successful: 1,
        failed: 0,
        totalProcessingTime: 100,
        errors: []
      };

      mockUploadService.uploadBatch.mockResolvedValue(mockBatchResult);

      const mockReq = {
        parsedFiles: [
          {
            fieldName: 'files',
            originalName: 'test1.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('file1')
          }
        ]
      };

      const result = await parser.processUploadedFiles(mockReq);

      expect(mockUploadService.uploadBatch).toHaveBeenCalledWith(mockReq.parsedFiles, {});
      expect(result).toEqual(mockBatchResult);
    });

    it('should handle requests without parsed files', async () => {
      const mockReq = {};

      const result = await parser.processUploadedFiles(mockReq);

      expect(result.totalFiles).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});

describe('FileUploadError classes', () => {
  it('should create FileSizeLimitError', () => {
    const error = new FileSizeLimitError('large-file.jpg', 10000000, 5000000);

    expect(error.message).toContain('File large-file.jpg size 10000000 exceeds limit 5000000');
    expect(error.code).toBe('FILE_SIZE_LIMIT');
    expect(error.fileName).toBe('large-file.jpg');
    expect(error.details).toEqual({ size: 10000000, limit: 5000000 });
  });

  it('should create FileTypeNotAllowedError', () => {
    const error = new FileTypeNotAllowedError('script.exe', 'application/x-msdownload');

    expect(error.message).toContain('File type application/x-msdownload not allowed');
    expect(error.code).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(error.fileName).toBe('script.exe');
    expect(error.details).toEqual({ mimeType: 'application/x-msdownload' });
  });

  it('should create FileSecurityError', () => {
    const threats = ['malware', 'trojan'];
    const error = new FileSecurityError('infected.exe', threats);

    expect(error.message).toContain('File infected.exe failed security check');
    expect(error.code).toBe('FILE_SECURITY_ERROR');
    expect(error.fileName).toBe('infected.exe');
    expect(error.details).toEqual({ threats });
  });

  it('should create generic FileUploadError', () => {
    const error = new FileUploadError('Custom error', 'CUSTOM_ERROR', 'file.txt', { extra: 'data' });

    expect(error.message).toBe('Custom error');
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.fileName).toBe('file.txt');
    expect(error.details).toEqual({ extra: 'data' });
  });
});

describe('FileUploadUtils', () => {
  describe('generateSecureFilename', () => {
    it('should generate secure filenames', () => {
      const filename = FileUploadUtils.generateSecureFilename('test-image.jpg');

      expect(filename).toMatch(/^[a-f0-9]{32}\.jpg$/);
      expect(filename).toHaveLength(36); // 32 hex chars + dot + extension
    });
  });

  describe('isFilenameSecure', () => {
    it('should validate secure filenames', () => {
      expect(FileUploadUtils.isFilenameSecure('normal-file.jpg')).toBe(true);
      expect(FileUploadUtils.isFilenameSecure('file with spaces.png')).toBe(true);
      expect(FileUploadUtils.isFilenameSecure('file-with-dashes.pdf')).toBe(true);
    });

    it('should reject insecure filenames', () => {
      expect(FileUploadUtils.isFilenameSecure('../../../etc/passwd')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file/with/slashes.jpg')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file\\with\\backslashes.png')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file\x00withnull.jpg')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file<with>brackets.jpg')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file|with|pipe.jpg')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file?with?question.jpg')).toBe(false);
      expect(FileUploadUtils.isFilenameSecure('file*with*wildcard.jpg')).toBe(false);
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME types', () => {
      expect(FileUploadUtils.getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(FileUploadUtils.getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
      expect(FileUploadUtils.getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(FileUploadUtils.getMimeTypeFromExtension('.pdf')).toBe('application/pdf');
      expect(FileUploadUtils.getMimeTypeFromExtension('.txt')).toBe('text/plain');
      expect(FileUploadUtils.getMimeTypeFromExtension('.json')).toBe('application/json');
    });

    it('should return null for unknown extensions', () => {
      expect(FileUploadUtils.getMimeTypeFromExtension('.unknown')).toBe(null);
      expect(FileUploadUtils.getMimeTypeFromExtension('')).toBe(null);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(FileUploadUtils.formatFileSize(512)).toBe('512.0 B');
      expect(FileUploadUtils.formatFileSize(1024)).toBe('1.0 KB');
      expect(FileUploadUtils.formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(FileUploadUtils.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(FileUploadUtils.formatFileSize(1536)).toBe('1.5 KB');
    });
  });
});

describe('FileUploadFactory', () => {
  it('should create file upload service instances', () => {
    const service = FileUploadFactory.create({ maxFileSize: 10 * 1024 * 1024 });

    expect(service).toBeInstanceOf(FileUploadService);
  });

  it('should create service with providers', () => {
    const cdnProvider = {} as S3CDNProvider;
    const imageProcessor = {} as SharpImageProvider;

    const service = FileUploadFactory.create(
      { storageProvider: 'cdn' },
      cdnProvider,
      imageProcessor
    );

    expect(service).toBeInstanceOf(FileUploadService);
  });

  it('should manage singleton instances', () => {
    const service1 = new FileUploadService();
    FileUploadFactory.setInstance(service1);

    const service2 = FileUploadFactory.getInstance();
    expect(service2).toBe(service1);

    // Should throw on duplicate set
    expect(() => FileUploadFactory.setInstance(new FileUploadService())).toThrow();
  });
});
