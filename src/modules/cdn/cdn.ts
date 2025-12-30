// CDN Service for Maysar Media Management
// Handles secure media uploads, signed URLs, and CDN operations

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export interface MediaUploadResult {
  key: string;
  url: string;
  signedUrl?: string;
  expiresAt?: Date;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  ipAddress?: string;
  userAgent?: string;
}

export class CDNService {
  private s3Client: S3Client;
  private cloudFrontClient: CloudFrontClient;
  private bucketName: string;
  private distributionId: string;
  private cdnDomain: string;

  constructor(
    bucketName: string,
    distributionId: string,
    cdnDomain: string,
    region: string = 'eu-west-1'
  ) {
    this.bucketName = bucketName;
    this.distributionId = distributionId;
    this.cdnDomain = cdnDomain;

    this.s3Client = new S3Client({
      region,
      // IRSA will provide credentials automatically
    });

    this.cloudFrontClient = new CloudFrontClient({
      region,
    });
  }

  /**
   * Upload media file to S3
   */
  async uploadMedia(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<MediaUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      // Enable server-side encryption
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(command);

    const url = `https://${this.cdnDomain}/${key}`;

    return {
      key,
      url,
    };
  }

  /**
   * Generate signed URL for private media access
   */
  async generateSignedUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const { expiresIn = 3600 } = options; // Default 1 hour

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  }

  /**
   * Generate CloudFront signed URL (more secure for public distributions)
   */
  generateCloudFrontSignedUrl(
    key: string,
    expiresAt: Date,
    privateKey: string,
    keyPairId: string
  ): string {
    // Implementation would use AWS SDK CloudFront signed URLs
    // This is a placeholder - actual implementation requires crypto operations
    const url = `https://${this.cdnDomain}/${key}`;
    return url; // Placeholder
  }

  /**
   * Invalidate CloudFront cache for specific paths
   */
  async invalidateCache(paths: string[]): Promise<void> {
    const command = new CreateInvalidationCommand({
      DistributionId: this.distributionId,
      InvalidationBatch: {
        CallerReference: `maysar-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });

    await this.cloudFrontClient.send(command);
  }

  /**
   * Generate presigned upload URL for direct browser uploads
   */
  async generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  }

  /**
   * Get public CDN URL for a media file
   */
  getPublicUrl(key: string): string {
    return `https://${this.cdnDomain}/${key}`;
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure media access token
   * This creates a short-lived token for media access
   */
  generateMediaToken(
    key: string,
    userId: string,
    expiresIn: number = 3600
  ): string {
    // Implementation would use JWT to create secure tokens
    // This is a simplified version
    const payload = {
      key,
      userId,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };

    // In production, sign this with a proper JWT secret
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Validate media access token
   */
  validateMediaToken(token: string): { key: string; userId: string } | null {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return null; // Token expired
      }

      return {
        key: payload.key,
        userId: payload.userId,
      };
    } catch (error) {
      return null;
    }
  }
}

// Factory function for creating CDN service
export function createCDNService(
  bucketName: string,
  distributionId: string,
  cdnDomain: string,
  region?: string
): CDNService {
  return new CDNService(bucketName, distributionId, cdnDomain, region);
}

// Export default
export default CDNService;
