import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type DocumentStorageProvider = 'local' | 's3' | 'cloudflare';

export interface DocumentStorageConfig {
  provider: DocumentStorageProvider;
  destination: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  signedUrlExpiresInSeconds: number;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface StoreDocumentInput {
  userId: string;
  documentType: string;
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface StoredDocumentMetadata {
  provider: DocumentStorageProvider;
  key?: string;
  bucket?: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  uploadedAt: string;
}

export type ResolvedDocumentAccess =
  | {
      kind: 'redirect';
      url: string;
      expiresAt?: string;
    }
  | {
      kind: 'buffer';
      buffer: Buffer;
      mimeType: string;
      fileName: string;
      size: number;
    };

const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sanitizePathSegment = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document';

const encodeS3Metadata = (metadata: Record<string, unknown> | undefined): Record<string, string> | undefined => {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  );
};

export const getDocumentStorageConfig = (): DocumentStorageConfig => ({
  provider: ((process.env.KYC_DOCUMENT_STORAGE_PROVIDER
    || process.env.UPLOAD_PROVIDER
    || 'local') as DocumentStorageProvider),
  destination: process.env.KYC_DOCUMENT_UPLOAD_DESTINATION
    || process.env.UPLOAD_DESTINATION
    || './uploads/kyc',
  bucket: process.env.KYC_DOCUMENTS_BUCKET
    || process.env.AWS_S3_BUCKET
    || process.env.CDN_BUCKET,
  region: process.env.KYC_DOCUMENT_STORAGE_REGION
    || process.env.AWS_REGION
    || process.env.CDN_REGION
    || 'auto',
  endpoint: process.env.KYC_DOCUMENT_STORAGE_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signedUrlExpiresInSeconds: parsePositiveInt(process.env.KYC_DOCUMENT_SIGNED_URL_EXPIRATION, 900),
  maxFileSizeBytes: parsePositiveInt(
    process.env.KYC_DOCUMENT_MAX_FILE_SIZE || process.env.UPLOAD_MAX_FILE_SIZE,
    10 * 1024 * 1024
  ),
  allowedMimeTypes: (process.env.KYC_DOCUMENT_ALLOWED_TYPES || process.env.UPLOAD_ALLOWED_TYPES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .length
    ? (process.env.KYC_DOCUMENT_ALLOWED_TYPES || process.env.UPLOAD_ALLOWED_TYPES || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    : DEFAULT_ALLOWED_MIME_TYPES
});

export class DocumentStorageService {
  private s3Client?: S3Client;

  constructor(private readonly config: DocumentStorageConfig = getDocumentStorageConfig()) {
    // Lazily initialize bucket clients so local/test boots stay cheap
    // and misconfigured non-upload environments fail only when used.
  }

  getConstraints(): { maxFileSizeBytes: number; allowedMimeTypes: string[] } {
    return {
      maxFileSizeBytes: this.config.maxFileSizeBytes,
      allowedMimeTypes: [...this.config.allowedMimeTypes]
    };
  }

  async storeDocument(input: StoreDocumentInput): Promise<StoredDocumentMetadata> {
    this.validateUpload(input);

    const checksumSha256 = crypto.createHash('sha256').update(input.buffer).digest('hex');
    const key = this.buildObjectKey(input);
    const uploadedAt = new Date().toISOString();

    if (this.config.provider === 'local') {
      const absolutePath = path.resolve(this.config.destination, key);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, input.buffer);

      return {
        provider: 'local',
        key,
        url: pathToFileURL(absolutePath).toString(),
        fileName: input.originalFileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.buffer.length,
        checksumSha256,
        uploadedAt
      };
    }

    if (!this.config.bucket) {
      throw new Error('Document storage bucket is not configured');
    }

    const s3Client = this.getS3Client();

    await s3Client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
      Metadata: encodeS3Metadata({
        userId: input.userId,
        documentType: input.documentType,
        originalFileName: input.originalFileName,
        checksumSha256,
        ...(input.metadata || {})
      })
    }));

    return {
      provider: this.config.provider,
      key,
      bucket: this.config.bucket,
      url: `s3://${this.config.bucket}/${key}`,
      fileName: input.originalFileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.buffer.length,
      checksumSha256,
      uploadedAt
    };
  }

  async resolveDocumentAccess(document: StoredDocumentMetadata): Promise<ResolvedDocumentAccess> {
    if (document.key && document.provider === 'local') {
      const absolutePath = path.resolve(this.config.destination, document.key);
      const buffer = await fs.readFile(absolutePath);
      return {
        kind: 'buffer',
        buffer,
        mimeType: document.mimeType || 'application/octet-stream',
        fileName: document.fileName || path.basename(absolutePath),
        size: buffer.length
      };
    }

    if (document.key && document.provider !== 'local') {
      if (!document.bucket) {
        throw new Error('Stored document is missing bucket-backed storage configuration');
      }

      const s3Client = this.getS3Client();
      const expiresAt = new Date(Date.now() + (this.config.signedUrlExpiresInSeconds * 1000)).toISOString();
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: document.bucket,
          Key: document.key,
          ResponseContentType: document.mimeType || 'application/octet-stream',
          ResponseContentDisposition: `inline; filename=\"${document.fileName || 'document'}\"`
        }),
        { expiresIn: this.config.signedUrlExpiresInSeconds }
      );

      return {
        kind: 'redirect',
        url,
        expiresAt
      };
    }

    if (document.url.startsWith('file://')) {
      const absolutePath = fileURLToPath(document.url);
      const buffer = await fs.readFile(absolutePath);
      return {
        kind: 'buffer',
        buffer,
        mimeType: document.mimeType || 'application/octet-stream',
        fileName: document.fileName || path.basename(absolutePath),
        size: buffer.length
      };
    }

    return {
      kind: 'redirect',
      url: document.url
    };
  }

  private createS3Client(): S3Client {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('Bucket-backed document storage requires AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    }

    return new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      }
    });
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = this.createS3Client();
    }

    return this.s3Client;
  }

  private validateUpload(input: StoreDocumentInput): void {
    if (input.buffer.length === 0) {
      throw new Error('Uploaded file is empty');
    }

    if (input.buffer.length > this.config.maxFileSizeBytes) {
      throw new Error(`Uploaded file exceeds maximum allowed size of ${this.config.maxFileSizeBytes} bytes`);
    }

    if (!this.config.allowedMimeTypes.includes(input.mimeType)) {
      throw new Error(`Unsupported document MIME type: ${input.mimeType}`);
    }
  }

  private buildObjectKey(input: StoreDocumentInput): string {
    const now = new Date();
    const year = `${now.getUTCFullYear()}`;
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${now.getUTCDate()}`.padStart(2, '0');
    const safeName = sanitizePathSegment(input.originalFileName);
    const suffix = crypto.randomBytes(8).toString('hex');

    return path.posix.join(
      'kyc',
      sanitizePathSegment(input.userId),
      sanitizePathSegment(input.documentType),
      year,
      month,
      day,
      `${suffix}-${safeName}`
    );
  }
}
