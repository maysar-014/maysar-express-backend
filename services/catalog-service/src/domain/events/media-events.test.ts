import {
  MediaCdnDeployedEvent,
  MediaDeletedEvent,
  MediaOptimizedEvent,
  MediaProcessedEvent,
  MediaProcessingFailedEvent,
  MediaTaggedEvent,
  MediaUpdatedEvent,
  MediaUploadedEvent,
  MediaViewedEvent
} from './media-events';
import { MediaId, SellerId } from '../value-objects/ids.value-object';

describe('media-events', () => {
  const occurredAt = new Date('2026-03-08T12:00:00.000Z');
  const mediaId = MediaId.fromString('media-1');
  const sellerId = SellerId.fromString('seller-1');

  it('creates upload/process/failure events with expected event types', () => {
    const uploaded = new MediaUploadedEvent(
      'evt-media-1',
      mediaId,
      sellerId,
      'admin',
      'prod-1',
      'product',
      'image',
      'hero.jpg',
      1024,
      'image/jpeg',
      'https://cdn.example/hero.jpg',
      'hero',
      occurredAt
    );
    const processed = new MediaProcessedEvent(
      'evt-media-2',
      mediaId,
      sellerId,
      {
        originalSize: 1024,
        processedSize: 700,
        thumbnails: [{ size: 'small', url: 'https://cdn.example/small.jpg', width: 150, height: 150 }],
        optimizationApplied: true,
        compressionRatio: 0.32
      },
      'processor',
      occurredAt
    );
    const failed = new MediaProcessingFailedEvent(
      'evt-media-3',
      mediaId,
      sellerId,
      'conversion failed',
      'IMG_PROCESS_ERR',
      2,
      'processor',
      occurredAt
    );

    expect(uploaded.eventType).toBe('MediaUploaded');
    expect(uploaded.occurredAt).toEqual(occurredAt);
    expect(processed.eventType).toBe('MediaProcessed');
    expect(processed.processingResults.optimizationApplied).toBe(true);
    expect(failed.eventType).toBe('MediaProcessingFailed');
    expect(failed.retryCount).toBe(2);
  });

  it('creates update/tag/optimize/cdn/view/delete events', () => {
    const updated = new MediaUpdatedEvent(
      'evt-media-4',
      mediaId,
      sellerId,
      { altText: 'updated' },
      'editor',
      occurredAt
    );
    const tagged = new MediaTaggedEvent(
      'evt-media-5',
      mediaId,
      sellerId,
      ['fashion', 'new'],
      'editor',
      true,
      occurredAt
    );
    const optimized = new MediaOptimizedEvent(
      'evt-media-6',
      mediaId,
      sellerId,
      {
        originalFormat: 'jpg',
        optimizedFormat: 'webp',
        originalSize: 1200,
        optimizedSize: 600,
        compressionRatio: 0.5,
        webpConverted: true,
        qualityScore: 93
      },
      'optimizer',
      occurredAt
    );
    const cdn = new MediaCdnDeployedEvent(
      'evt-media-7',
      mediaId,
      sellerId,
      {
        original: 'https://cdn.example/original.jpg',
        thumbnails: { small: 'https://cdn.example/small.jpg' },
        optimized: 'https://cdn.example/optimized.webp'
      },
      'cloudfront',
      'deployer',
      occurredAt
    );
    const viewed = new MediaViewedEvent(
      'evt-media-8',
      mediaId,
      'session-1',
      'product_page',
      'viewer-1',
      'agent',
      'referrer',
      occurredAt
    );
    const deleted = new MediaDeletedEvent(
      'evt-media-9',
      mediaId,
      sellerId,
      'admin',
      'cleanup',
      occurredAt
    );

    expect(updated.eventType).toBe('MediaUpdated');
    expect(tagged.eventType).toBe('MediaTagged');
    expect(optimized.eventType).toBe('MediaOptimized');
    expect(cdn.eventType).toBe('MediaCdnDeployed');
    expect(viewed.eventType).toBe('MediaViewed');
    expect(deleted.eventType).toBe('MediaDeleted');
  });
});
