const mockSend = jest.fn();
const mockPutObjectCommand = jest.fn((input) => ({ input }));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: mockPutObjectCommand,
}));

type SharpPipeline = {
  rotate: jest.Mock<SharpPipeline, []>;
  resize: jest.Mock<SharpPipeline, unknown[]>;
  webp: jest.Mock<SharpPipeline, unknown[]>;
  withMetadata: jest.Mock<SharpPipeline, unknown[]>;
  toBuffer: jest.Mock<Promise<Buffer>, []>;
};

const mockSharp = jest.fn(() => {
  const pipeline = {} as SharpPipeline;
  pipeline.rotate = jest.fn(() => pipeline);
  pipeline.resize = jest.fn(() => pipeline);
  pipeline.webp = jest.fn(() => pipeline);
  pipeline.withMetadata = jest.fn(() => pipeline);
  pipeline.toBuffer = jest.fn(async () => Buffer.from('processed-webp'));
  return pipeline;
});

jest.mock('sharp', () => ({
  __esModule: true,
  default: mockSharp,
}));

describe('ProductMediaStore', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockPutObjectCommand.mockClear();
    mockSharp.mockClear();
    process.env = {
      ...originalEnv,
      S3_ENDPOINT: 'http://minio:9000',
      S3_PUBLIC_ENDPOINT: 'https://cdn.example.test/media/',
      S3_BUCKET_PRODUCT_MEDIA: 'product-media',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'access',
      S3_SECRET_ACCESS_KEY: 'secret',
      S3_FORCE_PATH_STYLE: 'true',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uploads product media to the product bucket and returns public URLs', async () => {
    mockSend.mockResolvedValue({});
    const { ProductMediaStore } = await import('./product-media.store');

    const store = new ProductMediaStore();
    const result = await store.uploadProductImage(
      Buffer.from('image-bytes'),
      'image/webp',
      'seller/123',
    );

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockPutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
      Bucket: 'product-media',
      Key: expect.stringMatching(/^products\/seller_123\/[0-9a-f-]+\.webp$/),
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }));
    expect(mockPutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
      Bucket: 'product-media',
      Key: expect.stringMatching(/^products\/seller_123\/[0-9a-f-]+-thumb\.webp$/),
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }));
    expect(result.mediaUrl).toMatch(/^https:\/\/cdn\.example\.test\/media\/product-media\/products\/seller_123\/[0-9a-f-]+\.webp$/);
    expect(result.thumbnailUrl).toMatch(/^https:\/\/cdn\.example\.test\/media\/product-media\/products\/seller_123\/[0-9a-f-]+-thumb\.webp$/);
  });

  it('fails the upload when object storage is unavailable', async () => {
    mockSend.mockRejectedValueOnce(new Error('bucket missing'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ProductMediaStore } = await import('./product-media.store');

    const store = new ProductMediaStore();

    await expect(store.uploadProductImage(
      Buffer.from('image-bytes'),
      'image/webp',
      'seller-123',
    )).rejects.toMatchObject({
      statusCode: 503,
      code: 'MEDIA_STORAGE_UNAVAILABLE',
    });

    consoleErrorSpy.mockRestore();
  });
});
