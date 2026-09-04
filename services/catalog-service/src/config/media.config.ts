/**
 * Product media upload configuration.
 * Uses the same S3/MinIO infrastructure as the chat-service media store.
 */
export const mediaConfig = {
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'maysar',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'maysar2026',
    bucket: process.env.S3_BUCKET_PRODUCT_MEDIA ?? 'product-media',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },
  image: {
    /** Maximum input file size accepted by the endpoint (bytes). */
    maxFileSizeBytes: 20 * 1024 * 1024, // 20 MB; client pre-compresses to ~300 KB
    /** Max dimension (width or height) for the stored full-size image. */
    maxDimensionPx: 1200,
    /** Max dimension for the generated thumbnail. */
    thumbnailDimensionPx: 200,
    /** WebP quality for the stored full-size image (0-100). */
    webpQuality: 85,
    /** Accepted MIME types from the client. WebP is preferred after client preprocessing. */
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/jpg'],
  },
} as const;
