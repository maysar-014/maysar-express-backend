/**
 * Media Domain Events
 * Pure domain events representing business facts about media assets
 */

import { MediaId, ProductId, SellerId } from '../value-objects/ids.value-object';

export abstract class MediaDomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: MediaId;
  public readonly occurredAt: Date;
  public readonly eventVersion: number;

  constructor(
    eventId: string,
    aggregateId: MediaId,
    occurredAt: Date = new Date(),
    eventVersion: number = 1
  ) {
    this.eventId = eventId;
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt;
    this.eventVersion = eventVersion;
  }

  abstract get eventType(): string;
}

export class MediaUploadedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly uploadedBy: string,
    public readonly entityId: string,
    public readonly entityType: 'product' | 'category' | 'seller',
    public readonly mediaType: 'image' | 'video' | 'document',
    public readonly fileName: string,
    public readonly fileSize: number,
    public readonly mimeType: string,
    public readonly url: string,
    public readonly altText?: string,
    occurredAt: Date = new Date()
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaUploaded';
  }
}

export class MediaProcessedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly processingResults: {
      originalSize: number;
      processedSize: number;
      thumbnails: Array<{
        size: string;
        url: string;
        width: number;
        height: number;
      }>;
      optimizationApplied: boolean;
      compressionRatio: number;
    },
    public readonly processedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaProcessed';
  }
}

export class MediaProcessingFailedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly errorMessage: string,
    public readonly errorCode: string,
    public readonly retryCount: number,
    public readonly processingAttemptedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaProcessingFailed';
  }
}

export class MediaDeletedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly deletedBy: string,
    public readonly deletionReason?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaDeleted';
  }
}

export class MediaUpdatedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly changes: Record<string, any>,
    public readonly updatedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaUpdated';
  }
}

export class MediaTaggedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly tags: string[],
    public readonly taggedBy: string,
    public readonly autoTagged: boolean = false,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaTagged';
  }
}

export class MediaOptimizedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly optimizationResults: {
      originalFormat: string;
      optimizedFormat: string;
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
      webpConverted: boolean;
      qualityScore: number;
    },
    public readonly optimizedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaOptimized';
  }
}

export class MediaCdnDeployedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sellerId: SellerId,
    public readonly cdnUrls: {
      original: string;
      thumbnails: Record<string, string>;
      optimized: string;
    },
    public readonly cdnProvider: string,
    public readonly deployedBy: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaCdnDeployed';
  }
}

export class MediaViewedEvent extends MediaDomainEvent {
  constructor(
    eventId: string,
    aggregateId: MediaId,
    public readonly sessionId: string,
    public readonly viewSource: 'product_page' | 'search_results' | 'category_page' | 'direct_link',
    public readonly viewerId?: string,
    public readonly userAgent?: string,
    public readonly referrer?: string,
    occurredAt?: Date
  ) {
    super(eventId, aggregateId, occurredAt);
  }

  get eventType(): string {
    return 'MediaViewed';
  }
}

// Union type for all media events
export type MediaEvent =
  | MediaUploadedEvent
  | MediaProcessedEvent
  | MediaProcessingFailedEvent
  | MediaDeletedEvent
  | MediaUpdatedEvent
  | MediaTaggedEvent
  | MediaOptimizedEvent
  | MediaCdnDeployedEvent
  | MediaViewedEvent;
