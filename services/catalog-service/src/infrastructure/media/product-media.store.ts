/**
 * ProductMediaStore
 *
 * Receives an uploaded image buffer, runs it through a Sharp pipeline, and stores
 * both the full-size image and a thumbnail in MinIO/S3 under a
 * `products/{sellerId}/` prefix.
 *
 * Pipeline:
 *   1. Validate MIME type and file size.
 *   2. Normalize to a square 1200x1200 canvas with a neutral background, strip EXIF, output WebP.
 *   3. Generate a matching 200x200 contain-style thumbnail without cropping the product.
 *   4. Upload both to S3/MinIO.
 *   5. Return { mediaUrl, thumbnailUrl }.
 */

import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { mediaConfig } from '../../config/media.config';

export interface ProductMediaUploadResult {
  mediaUrl: string;
  thumbnailUrl: string;
}

export class ProductMediaStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.client = new S3Client({
      endpoint: mediaConfig.s3.endpoint,
      region: mediaConfig.s3.region,
      credentials: {
        accessKeyId: mediaConfig.s3.accessKeyId,
        secretAccessKey: mediaConfig.s3.secretAccessKey,
      },
      forcePathStyle: mediaConfig.s3.forcePathStyle,
    });
    this.bucket = mediaConfig.s3.bucket;
    this.publicBaseUrl = `${mediaConfig.s3.publicEndpoint.replace(/\/+$/, '')}/${this.bucket}`;
  }

  /**
   * Upload a product image for a given seller.
   * Validates, transforms via Sharp, and stores full + thumbnail.
   */
  async uploadProductImage(
    buffer: Buffer,
    mimeType: string,
    sellerId: string,
  ): Promise<ProductMediaUploadResult> {
    const { allowedMimeTypes, maxFileSizeBytes } = mediaConfig.image;
    if (!allowedMimeTypes.includes(mimeType as any)) {
      throw Object.assign(
        new Error(`Unsupported image format: ${mimeType}. Accepted: ${allowedMimeTypes.join(', ')}`),
        { statusCode: 422, code: 'UNSUPPORTED_IMAGE_FORMAT' },
      );
    }
    if (buffer.length > maxFileSizeBytes) {
      throw Object.assign(
        new Error(`File exceeds ${maxFileSizeBytes / 1024 / 1024} MB limit`),
        { statusCode: 413, code: 'FILE_TOO_LARGE' },
      );
    }

    const { maxDimensionPx, thumbnailDimensionPx, webpQuality } = mediaConfig.image;
    const uuid = randomUUID();
    const safeSellerPrefix = sellerId.replace(/[^a-z0-9_-]/gi, '_');

    const fullKey = `products/${safeSellerPrefix}/${uuid}.webp`;
    const thumbKey = `products/${safeSellerPrefix}/${uuid}-thumb.webp`;

    const canonicalBackground = '#f7f7f5';
    const fullBuffer = await sharp(buffer)
      .rotate()
      .resize(maxDimensionPx, maxDimensionPx, {
        fit: 'contain',
        background: canonicalBackground,
        withoutEnlargement: false,
      })
      .flatten({ background: canonicalBackground })
      .webp({ quality: webpQuality })
      .withMetadata({ exif: {} })
      .toBuffer();

    // Derive the thumbnail from the canonical full asset so both variants
    // share identical framing and never crop a different part of the product.
    const thumbBuffer = await sharp(fullBuffer)
      .resize(thumbnailDimensionPx, thumbnailDimensionPx, {
        fit: 'contain',
        background: canonicalBackground,
        withoutEnlargement: false,
      })
      .flatten({ background: canonicalBackground })
      .webp({ quality: 82 })
      .withMetadata({ exif: {} })
      .toBuffer();

    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: fullBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }));
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }));

      return {
        mediaUrl: `${this.publicBaseUrl}/${fullKey}`,
        thumbnailUrl: `${this.publicBaseUrl}/${thumbKey}`,
      };
    } catch (s3Error) {
      console.error('[ProductMediaStore] S3 upload failed:', (s3Error as Error).message);
      throw Object.assign(
        new Error('Product media storage is unavailable. Please try again later.'),
        { statusCode: 503, code: 'MEDIA_STORAGE_UNAVAILABLE' },
      );
    }
  }
  /** Remove a previously uploaded image and its generated thumbnail. */
  async deleteProductImages(urls: string[]): Promise<void> {
    const keys = new Set<string>();

    for (const url of urls) {
      try {
        const parsed = new URL(url);
        const bucketPrefix = '/' + this.bucket + '/';
        if (!parsed.pathname.startsWith(bucketPrefix)) continue;
        const key = decodeURIComponent(parsed.pathname.slice(bucketPrefix.length));
        if (!key.startsWith('products/')) continue;
        keys.add(key);
        if (key.endsWith('.webp') && !key.endsWith('-thumb.webp')) {
          keys.add(key.slice(0, -'.webp'.length) + '-thumb.webp');
        }
      } catch {
        // Ignore malformed or externally hosted URLs; they are not ours to delete.
      }
    }

    await Promise.all(Array.from(keys, (Key) => this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key,
    }))));
  }
}
