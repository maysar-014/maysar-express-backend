/**
 * Maysar Engineering — File Upload Validation Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 14: Search, Files and Storage — File operations shall:
 *     Enforce suitable size restrictions, validate incoming content,
 *     avoid unnecessary conversions, use streaming where beneficial,
 *     prevent uncontrolled memory consumption, preserve data integrity.
 *   - Article 17: Security by Design — Input validation
 *   - Article 7: Resource Efficiency Doctrine — Disk I/O and persistent storage
 */

/**
 * Maysar Engineering — File Upload Validation Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 14: Search, Files and Storage — File operations shall:
 *     Enforce suitable size restrictions, validate incoming content,
 *     avoid unnecessary conversions, use streaming where beneficial,
 *     prevent uncontrolled memory consumption, preserve data integrity.
 *   - Article 17: Security by Design — Input validation
 *   - Article 7: Resource Efficiency Doctrine — Disk I/O and persistent storage
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createWriteStream } from 'fs';
import { createLogger } from '../../shared/logger/logger';

const logger = createLogger('UploadMiddleware', 'security');

export interface UploadConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  dest: string;
  enableMalwareScan: boolean;
  fieldName: string;
}

const DEFAULT_CONFIG: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 1,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'text/csv',
    'application/json',
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
    '.pdf', '.csv', '.json',
  ],
  dest: process.env.UPLOAD_DEST || './uploads',
  enableMalwareScan: false,
  fieldName: 'file',
}

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: import('stream').Readable;
}

type MulterStorageEngine = {
  _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): void;
  _removeFile(req: any, file: any, cb: (error?: any) => void): void;
}

class StreamStorage implements MulterStorageEngine {
  private readonly dest: string;

  constructor(dest: string) {
    this.dest = dest;
  }

  _handleFile(
    req: Request,
    file: MulterFile,
    callback: (error?: any, info?: any) => void
  ): void {
    const filePath = path.join(this.dest, file.filename);
    const stream = createWriteStream(filePath);

    stream.on('error', (error) => {
      callback(error);
    });

    stream.on('finish', () => {
      callback(undefined, {
        destination: this.dest,
        filename: file.filename,
        path: filePath,
        size: stream.bytesWritten || 0,
      });
    });

    file.stream.pipe(stream);
  }

  _removeFile(
    req: Request,
    file: MulterFile,
    callback: (error?: any) => void
  ): void {
    const filePath = path.join(this.dest, file.filename);
    const fs = require('fs');
    fs.unlink(filePath, callback);
  }
}

function createFileFilter(config: UploadConfig): (req: Request, file: MulterFile, cb: (error?: Error | null, accept?: boolean) => void) => void {
  const allowedMimeTypes = new Set(config.allowedMimeTypes);
  const allowedExtensions = new Set(config.allowedExtensions.map(ext => ext.toLowerCase()));

  return (req: Request, file: MulterFile, cb: (error?: Error | null, accept?: boolean) => void): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    const extAllowed = allowedExtensions.has(ext);
    const mimeAllowed = allowedMimeTypes.has(mimeType);

    if (!extAllowed || !mimeAllowed) {
      cb(new Error(`File type not allowed: ${file.originalname} (${mimeType}, ${ext})`));
      return;
    }

    cb(null, true);
  };
}



export function createUploadMiddleware(config: Partial<UploadConfig> = {}): any {
  const mergedConfig: UploadConfig = { ...DEFAULT_CONFIG, ...config };

  const fs = require('fs');
  if (!fs.existsSync(mergedConfig.dest)) {
    fs.mkdirSync(mergedConfig.dest, { recursive: true });
  }

  const storage = new StreamStorage(mergedConfig.dest);
  const fileFilter = createFileFilter(mergedConfig);

  const multer = require('multer');
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: mergedConfig.maxFileSize,
      files: mergedConfig.maxFiles,
    },
  });
}

export function uploadMiddleware(config: Partial<UploadConfig> = {}) {
  const upload = createUploadMiddleware(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(config.fieldName || 'file')(req, res, (err?: any) => {
      if (err && err.code) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(413).json({
              success: false,
              error: 'File too large',
              message: `File exceeds maximum size of ${Math.floor(config.maxFileSize || DEFAULT_CONFIG.maxFileSize) / (1024 * 1024)}MB`,
              code: 'FILE_TOO_LARGE',
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              error: 'Too many files',
              message: `Maximum ${config.maxFiles || DEFAULT_CONFIG.maxFiles} file(s) allowed per request`,
              code: 'TOO_MANY_FILES',
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              error: 'Unexpected file field',
              message: `Unexpected file field: ${err.field}`,
              code: 'UNEXPECTED_FILE_FIELD',
            });
          default:
            return res.status(400).json({
              success: false,
              error: 'Upload error',
              message: err.message,
              code: 'UPLOAD_ERROR',
            });
        }
      }

      if (err) {
        logger.warn('File upload validation failed', { error: err.message, filename: req.file?.originalname });
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: err.message,
          code: 'FILE_VALIDATION_FAILED',
        });
      }

      next();
    });
  };
}

export function uploadMultipleMiddleware(config: Partial<UploadConfig> = {}) {
  const upload = createUploadMiddleware(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    upload.array(config.fieldName || 'file', config.maxFiles || DEFAULT_CONFIG.maxFiles)(req, res, (err?: any) => {
      if (err && err.code) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(413).json({
              success: false,
              error: 'File too large',
              message: `File exceeds maximum size of ${Math.floor(config.maxFileSize || DEFAULT_CONFIG.maxFileSize) / (1024 * 1024)}MB`,
              code: 'FILE_TOO_LARGE',
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              error: 'Too many files',
              message: `Maximum ${config.maxFiles || DEFAULT_CONFIG.maxFiles} file(s) allowed per request`,
              code: 'TOO_MANY_FILES',
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              error: 'Unexpected file field',
              message: `Unexpected file field: ${err.field}`,
              code: 'UNEXPECTED_FILE_FIELD',
            });
          default:
            return res.status(400).json({
              success: false,
              error: 'Upload error',
              message: err.message,
              code: 'UPLOAD_ERROR',
            });
        }
      }

      if (err) {
        logger.warn('File upload validation failed', { error: err.message, filename: req.file?.originalname });
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: err.message,
          code: 'FILE_VALIDATION_FAILED',
        });
      }

      next();
    });
  };
}

export const uploadConfigs = {
  productImage: {
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 1,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    dest: './uploads/products',
    fieldName: 'image',
  },

  productMedia: {
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    dest: './uploads/products',
    fieldName: 'images',
  },

  document: {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 1,
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    dest: './uploads/documents',
    fieldName: 'document',
  },

  chatMedia: {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 1,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/csv',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.csv'],
    dest: './uploads/chat',
    fieldName: 'file',
  },

  kycDocument: {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 3,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
    dest: './uploads/kyc',
    fieldName: 'documents',
  },
};