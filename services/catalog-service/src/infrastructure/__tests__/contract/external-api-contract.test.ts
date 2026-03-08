import { ElasticsearchProvider, SearchProvider as SearchProviderEnum } from '../../providers/search.provider';
import { CDNProvider, S3CDNProvider } from '../../providers/cdn.provider';
import { ImageProcessingProvider, SharpImageProvider } from '../../providers/image-processing.provider';
import { MemoryCacheProvider } from '../../providers/cache-provider';

describe('External API Contract Tests', () => {
  it('search provider returns SearchResult contract shape', async () => {
    const searchProvider = new ElasticsearchProvider({
      provider: SearchProviderEnum.ELASTICSEARCH,
      host: 'localhost',
      port: 9200,
      protocol: 'http',
      indexName: 'products',
      timeout: 1000,
      maxRetries: 1,
      batchSize: 100,
      enableMonitoring: false,
      enableCaching: false
    });

    const result = await searchProvider.search({
      index: 'products',
      query: { match_all: {} },
      size: 10
    });

    expect(result).toHaveProperty('hits');
    expect(Array.isArray(result.hits)).toBe(true);
    expect(result).toHaveProperty('total');
  });

  it('cdn provider upload contract includes key/url/etag/size', async () => {
    const cdnProvider = new S3CDNProvider({
      provider: CDNProvider.AWS_S3,
      bucket: 'test-bucket',
      region: 'us-east-1',
      timeout: 1000,
      maxFileSize: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png']
    });

    const upload = await cdnProvider.uploadFile(Buffer.from('data'), {
      key: 'products/test.jpg',
      contentType: 'image/jpeg'
    });

    expect(upload.key).toBe('products/test.jpg');
    expect(upload.url).toContain('test-bucket');
    expect(typeof upload.etag).toBe('string');
    expect(upload.size).toBeGreaterThan(0);
  });

  it('image provider process contract includes transformed metadata', async () => {
    const imageProvider = new SharpImageProvider({
      provider: ImageProcessingProvider.SHARP,
      maxFileSize: 10 * 1024 * 1024,
      allowedFormats: ['jpeg', 'png', 'webp', 'avif'],
      quality: 85,
      timeout: 1000,
      concurrency: 2,
      cacheEnabled: false
    });

    const processed = await imageProvider.processImage(Buffer.from('img-data'), {
      width: 800,
      height: 600,
      format: 'webp',
      quality: 85
    });

    expect(processed.format).toBe('webp');
    expect(processed.width).toBe(800);
    expect(processed.height).toBe(600);
    expect(processed.size).toBeGreaterThanOrEqual(0);
  });

  it('memory cache provider supports set/get/delete/exists contract', async () => {
    const cacheProvider = new MemoryCacheProvider();

    await cacheProvider.set('test-key', 'test-value', 60);
    const value = await cacheProvider.get('test-key');
    expect(value).toBe('test-value');

    const existsBeforeDelete = await cacheProvider.exists('test-key');
    expect(existsBeforeDelete).toBe(true);

    const deleted = await cacheProvider.delete('test-key');
    expect(deleted).toBe(true);

    const existsAfterDelete = await cacheProvider.exists('test-key');
    expect(existsAfterDelete).toBe(false);
  });
});
