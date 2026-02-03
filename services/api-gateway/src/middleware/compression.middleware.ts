/**
 * Compression Middleware
 * 
 * Handles response compression for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { gzip, deflate } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);

export interface CompressionOptions {
  threshold: number;
  level: number;
  memLevel: number;
  chunkSize: number;
  filter: (req: Request, res: Response) => boolean;
}

export class CompressionMiddleware {
  private options: CompressionOptions;

  constructor(options?: Partial<CompressionOptions>) {
    this.options = {
      threshold: 1024, // Only compress responses larger than 1KB
      level: 6, // Compression level (1-9)
      memLevel: 8, // Memory level (1-9)
      chunkSize: 16 * 1024, // 16KB chunks
      filter: this.defaultFilter,
      ...options,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Store original end method
      const originalEnd = res.end;
      const originalWrite = res.write;
      const originalWriteHead = res.writeHead;

      let responseBody = Buffer.alloc(0);
      let statusCode = 200;
      let headers: Record<string, any> = {};

      // Override writeHead to capture headers
      res.writeHead = function(code: number, headersArg?: any) {
        statusCode = code;
        if (typeof headersArg === 'object') {
          headers = { ...headers, ...headersArg };
        }
        return originalWriteHead.call(this, code, headersArg);
      };

      // Override write to capture response body
      res.write = function(chunk: any, encoding?: any) {
        if (chunk) {
          responseBody = Buffer.concat([responseBody, Buffer.from(chunk, encoding)]);
        }
        return true; // Always return true for compression middleware
      };

      // Override end to handle compression
      res.end = async function(chunk?: any, encoding?: any) {
        if (chunk) {
          responseBody = Buffer.concat([responseBody, Buffer.from(chunk, encoding)]);
        }

        // Check if compression should be applied
        if (responseBody.length >= compressionMiddleware.options.threshold && 
            compressionMiddleware.shouldCompress(req, res) && 
            statusCode >= 200 && statusCode < 300) {
          
          const acceptEncoding = req.headers['accept-encoding'] || '';
          const contentEncoding = compressionMiddleware.selectEncoding(acceptEncoding);
          
          if (contentEncoding) {
            try {
              const compressedBody = await compressionMiddleware.compress(responseBody, contentEncoding);
              
              // Set compression headers
              res.setHeader('Content-Encoding', contentEncoding);
              res.setHeader('Content-Length', compressedBody.length);
              res.removeHeader('Transfer-Encoding');
              
              // Send compressed response
              originalEnd.call(res, compressedBody);
              return;
            } catch (error) {
              // If compression fails, send uncompressed
              console.error('Compression failed:', error);
            }
          }
        }

        // Send uncompressed response
        if (responseBody.length > 0) {
          originalEnd.call(res, responseBody);
        } else {
          originalEnd.call(res);
        }
      };

      next();
    };
  }

  private defaultFilter(req: Request, res: Response): boolean {
    // Don't compress if already compressed
    if (res.getHeader('Content-Encoding')) {
      return false;
    }

    // Don't compress if response is too small
    const contentLength = res.getHeader('Content-Length');
    if (contentLength && parseInt(String(contentLength)) < compressionMiddleware.options.threshold) {
      return false;
    }

    // Don't compress if content type is not compressible
    const contentType = res.getHeader('Content-Type') || '';
    return compressionMiddleware.isCompressibleContentType(contentType);
  }

  private shouldCompress(req: Request, res: Response): boolean {
    return compressionMiddleware.options.filter(req, res);
  }

  private selectEncoding(acceptEncoding: string): string | null {
    if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    } else if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    }
    return null;
  }

  private async compress(buffer: Buffer, encoding: string): Promise<Buffer> {
    switch (encoding) {
      case 'gzip':
        return await gzipAsync(buffer, {
          level: compressionMiddleware.options.level,
          memLevel: compressionMiddleware.options.memLevel,
          chunkSize: compressionMiddleware.options.chunkSize,
        });
      case 'deflate':
        return await deflateAsync(buffer, {
          level: compressionMiddleware.options.level,
          memLevel: compressionMiddleware.options.memLevel,
          chunkSize: compressionMiddleware.options.chunkSize,
        });
      default:
        return buffer;
    }
  }

  private isCompressibleContentType(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/xml+rss',
      'application/atom+xml',
      'application/x-www-form-urlencoded',
    ];

    return compressibleTypes.some(type => contentType.includes(type));
  }
}

// Default compression middleware instance
export const compressionMiddleware = new CompressionMiddleware();

// Export middleware function
export const compression = compressionMiddleware.middleware();