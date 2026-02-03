import { User } from './user.entity';

/**
 * Post types in the marketplace community
 */
export enum PostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  POLL = 'poll',
  EVENT = 'event',
  PRODUCT_ANNOUNCEMENT = 'product_announcement',
  PROMOTION = 'promotion',
  QUESTION = 'question',
  DELIVERY_UPDATE = 'delivery_update',
  DISPUTE_CLARIFICATION = 'dispute_clarification',
  SYSTEM_NOTICE = 'system_notice'
}

/**
 * Post visibility levels
 */
export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private'
}

/**
 * Post status
 */
export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted'
}

/**
 * Post metadata for commerce integration
 */
export interface PostMetadata {
  relatedProductId?: string;
  relatedOrderId?: string;
  relatedShipmentId?: string;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  pollOptions?: string[];
  eventDetails?: {
    startDate: Date;
    endDate?: Date;
    location?: string;
    capacity?: number;
  };
}

/**
 * Post entity representing content in the marketplace community
 */
export class Post {
  private constructor(
    private readonly _id: string,
    private readonly _authorId: string,
    private _content: string,
    private readonly _type: PostType,
    private _visibility: PostVisibility,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _status: PostStatus,
    private _isPinned: boolean,
    private _isFeatured: boolean,
    private _publishedAt?: Date,
    private _title?: string,
    private _metadata?: PostMetadata,
    private _moderatedBy?: string,
    private _moderatedAt?: Date,
    private _moderationReason?: string
  ) {}

  // Factory methods
  static create(params: {
    id: string;
    authorId: string;
    content: string;
    type: PostType;
    title?: string;
    visibility?: PostVisibility;
    metadata?: PostMetadata;
  }): Post {
    const now = new Date();
    return new Post(
      params.id,
      params.authorId,
      params.content,
      params.type,
      params.visibility || PostVisibility.PUBLIC,
      now,
      now,
      PostStatus.DRAFT,
      false,
      false,
      undefined,
      params.title,
      params.metadata
    );
  }

  static createPublished(params: {
    id: string;
    authorId: string;
    content: string;
    type: PostType;
    title?: string;
    visibility?: PostVisibility;
    metadata?: PostMetadata;
  }): Post {
    const now = new Date();
    return new Post(
      params.id,
      params.authorId,
      params.content,
      params.type,
      params.visibility || PostVisibility.PUBLIC,
      now,
      now,
      PostStatus.PUBLISHED,
      false,
      false,
      now,
      params.title,
      params.metadata
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get authorId(): string {
    return this._authorId;
  }

  get title(): string | undefined {
    return this._title;
  }

  get content(): string {
    return this._content;
  }

  get type(): PostType {
    return this._type;
  }

  get visibility(): PostVisibility {
    return this._visibility;
  }

  get metadata(): PostMetadata | undefined {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get publishedAt(): Date | undefined {
    return this._publishedAt;
  }

  get status(): PostStatus {
    return this._status;
  }

  get isPinned(): boolean {
    return this._isPinned;
  }

  get isFeatured(): boolean {
    return this._isFeatured;
  }

  get moderatedBy(): string | undefined {
    return this._moderatedBy;
  }

  get moderatedAt(): Date | undefined {
    return this._moderatedAt;
  }

  get moderationReason(): string | undefined {
    return this._moderationReason;
  }

  // Business methods
  publish(): void {
    if (this._status !== PostStatus.DRAFT) {
      throw new Error('Only draft posts can be published');
    }
    this._status = PostStatus.PUBLISHED;
    this._publishedAt = new Date();
    this._updatedAt = new Date();
  }

  updateContent(content: string, title?: string): void {
    if (this._status === PostStatus.DELETED) {
      throw new Error('Cannot update deleted posts');
    }
    this._content = content;
    if (title !== undefined) {
      this._title = title;
    }
    this._updatedAt = new Date();
  }

  changeVisibility(visibility: PostVisibility): void {
    this._visibility = visibility;
    this._updatedAt = new Date();
  }

  pin(): void {
    this._isPinned = true;
    this._updatedAt = new Date();
  }

  unpin(): void {
    this._isPinned = false;
    this._updatedAt = new Date();
  }

  feature(): void {
    this._isFeatured = true;
    this._updatedAt = new Date();
  }

  unfeature(): void {
    this._isFeatured = false;
    this._updatedAt = new Date();
  }

  hide(): void {
    this._status = PostStatus.HIDDEN;
    this._updatedAt = new Date();
  }

  unhide(): void {
    if (this._status === PostStatus.HIDDEN) {
      this._status = this._publishedAt ? PostStatus.PUBLISHED : PostStatus.DRAFT;
      this._updatedAt = new Date();
    }
  }

  delete(): void {
    this._status = PostStatus.DELETED;
    this._updatedAt = new Date();
  }

  moderate(moderatorId: string, reason?: string): void {
    this._moderatedBy = moderatorId;
    this._moderatedAt = new Date();
    this._moderationReason = reason;
    this._updatedAt = new Date();
  }

  // Business rules and queries
  isPublished(): boolean {
    return this._status === PostStatus.PUBLISHED && !!this._publishedAt;
  }

  isVisibleTo(userId: string, authorId: string, isFollower: boolean): boolean {
    if (this._status !== PostStatus.PUBLISHED) {
      return false;
    }

    switch (this._visibility) {
      case PostVisibility.PUBLIC:
        return true;
      case PostVisibility.FOLLOWERS:
        return isFollower || userId === authorId;
      case PostVisibility.PRIVATE:
        return userId === authorId;
      default:
        return false;
    }
  }

  isCommercialPost(): boolean {
    return [
      PostType.PRODUCT_ANNOUNCEMENT,
      PostType.PROMOTION
    ].includes(this._type);
  }

  isSystemPost(): boolean {
    return [
      PostType.SYSTEM_NOTICE,
      PostType.DELIVERY_UPDATE,
      PostType.DISPUTE_CLARIFICATION
    ].includes(this._type);
  }

  requiresModeration(): boolean {
    return this.isCommercialPost() || this._type === PostType.EVENT;
  }

  hasExpired(): boolean {
    if (!this._metadata?.eventDetails?.endDate) {
      return false;
    }
    return new Date() > this._metadata.eventDetails.endDate;
  }

  // Commerce integration helpers
  getRelatedProductId(): string | undefined {
    return this._metadata?.relatedProductId;
  }

  getRelatedOrderId(): string | undefined {
    return this._metadata?.relatedOrderId;
  }

  getRelatedShipmentId(): string | undefined {
    return this._metadata?.relatedShipmentId;
  }

  getTags(): string[] {
    return this._metadata?.tags || [];
  }

  getLocation(): { latitude: number; longitude: number; address?: string } | undefined {
    return this._metadata?.location;
  }

  // Event-specific methods
  getEventDetails() {
    if (this._type !== PostType.EVENT) {
      return null;
    }
    return this._metadata?.eventDetails;
  }

  // Poll-specific methods
  getPollOptions(): string[] {
    if (this._type !== PostType.POLL) {
      return [];
    }
    return this._metadata?.pollOptions || [];
  }

  // Serialization
  toJSON() {
    return {
      id: this._id,
      authorId: this._authorId,
      title: this._title,
      content: this._content,
      type: this._type,
      visibility: this._visibility,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      publishedAt: this._publishedAt?.toISOString(),
      status: this._status,
      isPinned: this._isPinned,
      isFeatured: this._isFeatured,
      moderatedBy: this._moderatedBy,
      moderatedAt: this._moderatedAt?.toISOString(),
      moderationReason: this._moderationReason
    };
  }
}
