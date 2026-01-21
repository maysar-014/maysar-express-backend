import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Post, PostType, PostVisibility, PostMetadata } from '../entities/post.entity';
import { TrustMetadata } from '../value-objects/trust-metadata.value-object';

/**
 * Posting permissions policy
 * Defines what content different user roles can create and under what conditions
 */
export class PostingPermissionsPolicy {
  // Role-based posting permissions
  private static readonly ROLE_PERMISSIONS: Record<UserRole, PostType[]> = {
    [UserRole.BUYER]: [
      PostType.TEXT,
      PostType.IMAGE,
      PostType.VIDEO,
      PostType.LINK,
      PostType.QUESTION
    ],
    [UserRole.SELLER]: [
      PostType.TEXT,
      PostType.IMAGE,
      PostType.VIDEO,
      PostType.LINK,
      PostType.QUESTION,
      PostType.PRODUCT_ANNOUNCEMENT,
      PostType.PROMOTION,
      PostType.EVENT
    ],
    [UserRole.SUPPLIER]: [
      PostType.TEXT,
      PostType.IMAGE,
      PostType.VIDEO,
      PostType.LINK,
      PostType.QUESTION,
      PostType.PRODUCT_ANNOUNCEMENT,
      PostType.PROMOTION,
      PostType.EVENT
    ],
    [UserRole.COURIER]: [
      PostType.TEXT,
      PostType.IMAGE,
      PostType.DELIVERY_UPDATE,
      PostType.QUESTION
    ],
    [UserRole.ENABLER]: [
      PostType.TEXT,
      PostType.IMAGE,
      PostType.SYSTEM_NOTICE,
      PostType.QUESTION
    ],
    [UserRole.SYSTEM]: [
      PostType.SYSTEM_NOTICE,
      PostType.DELIVERY_UPDATE,
      PostType.DISPUTE_CLARIFICATION
    ]
  };

  // Visibility options by role
  private static readonly VISIBILITY_PERMISSIONS: Record<UserRole, PostVisibility[]> = {
    [UserRole.BUYER]: [PostVisibility.PUBLIC, PostVisibility.PRIVATE],
    [UserRole.SELLER]: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS, PostVisibility.PRIVATE],
    [UserRole.SUPPLIER]: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS, PostVisibility.PRIVATE],
    [UserRole.COURIER]: [PostVisibility.PUBLIC, PostVisibility.PRIVATE],
    [UserRole.ENABLER]: [PostVisibility.PUBLIC],
    [UserRole.SYSTEM]: [PostVisibility.PUBLIC]
  };

  // Daily posting limits by trust level
  private static readonly DAILY_POSTING_LIMITS = {
    low: 3,
    medium: 10,
    high: 25,
    elite: 50
  };

  // Commercial posting limits (products/promotions per day)
  private static readonly COMMERCIAL_POSTING_LIMITS = {
    low: 1,
    medium: 3,
    high: 10,
    elite: 25
  };

  /**
   * Determines if a user can create a specific type of post
   */
  static canCreatePostType(user: User, postType: PostType): boolean {
    // User must be active
    if (user.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Check role permissions
    const allowedTypes = this.ROLE_PERMISSIONS[user.role] || [];
    if (!allowedTypes.includes(postType)) {
      return false;
    }

    // Special restrictions for commercial content
    if (this.isCommercialPostType(postType)) {
      return this.canCreateCommercialContent(user);
    }

    // Special restrictions for system content
    if (postType === PostType.SYSTEM_NOTICE) {
      return user.role === UserRole.ENABLER || user.role === UserRole.SYSTEM;
    }

    return true;
  }

  /**
   * Determines if a user can use a specific visibility setting
   */
  static canUseVisibility(user: User, visibility: PostVisibility): boolean {
    const allowedVisibilities = this.VISIBILITY_PERMISSIONS[user.role] || [];
    return allowedVisibilities.includes(visibility);
  }

  /**
   * Checks if user has reached daily posting limit
   */
  static hasReachedDailyLimit(user: User, postsToday: number): boolean {
    const trustLevel = user.trustMetadata.getTrustLevel();
    const limit = this.DAILY_POSTING_LIMITS[trustLevel];
    return postsToday >= limit;
  }

  /**
   * Checks if user has reached commercial posting limit
   */
  static hasReachedCommercialLimit(user: User, commercialPostsToday: number): boolean {
    const trustLevel = user.trustMetadata.getTrustLevel();
    const limit = this.COMMERCIAL_POSTING_LIMITS[trustLevel];
    return commercialPostsToday >= limit;
  }

  /**
   * Determines if user can create commercial content
   */
  static canCreateCommercialContent(user: User): boolean {
    // Must be verified for commercial content
    if (!user.isVerified) {
      return false;
    }

    // Must have minimum trust score
    if (user.trustMetadata.ratingScore < 4.0) {
      return false;
    }

    // Must have minimum completed orders
    if (user.trustMetadata.completedOrders < 5) {
      return false;
    }

    // Must have low dispute rate
    if (user.trustMetadata.disputeRate > 0.1) {
      return false;
    }

    return true;
  }

  /**
   * Determines if user can attach commerce metadata to posts
   */
  static canAttachCommerceMetadata(user: User, metadata: PostMetadata): boolean {
    // Only sellers and suppliers can attach product/order metadata
    if (metadata.relatedProductId || metadata.relatedOrderId) {
      return [UserRole.SELLER, UserRole.SUPPLIER].includes(user.role);
    }

    // Only couriers can attach shipment metadata
    if (metadata.relatedShipmentId) {
      return user.role === UserRole.COURIER;
    }

    return true;
  }

  /**
   * Validates post metadata based on post type and user permissions
   */
  static validatePostMetadata(user: User, postType: PostType, metadata?: PostMetadata): { isValid: boolean; reason?: string } {
    if (!metadata) {
      return { isValid: true };
    }

    // Validate commerce metadata permissions
    if (!this.canAttachCommerceMetadata(user, metadata)) {
      return { isValid: false, reason: 'User not authorized to attach commerce metadata' };
    }

    // Validate event metadata
    if (postType === PostType.EVENT) {
      if (!metadata.eventDetails) {
        return { isValid: false, reason: 'Event posts must include event details' };
      }

      const eventDetails = metadata.eventDetails;
      if (eventDetails.startDate <= new Date()) {
        return { isValid: false, reason: 'Event start date must be in the future' };
      }

      if (eventDetails.endDate && eventDetails.endDate <= eventDetails.startDate) {
        return { isValid: false, reason: 'Event end date must be after start date' };
      }

      if (eventDetails.capacity && eventDetails.capacity < 1) {
        return { isValid: false, reason: 'Event capacity must be at least 1' };
      }
    }

    // Validate poll metadata
    if (postType === PostType.POLL) {
      if (!metadata.pollOptions || metadata.pollOptions.length < 2) {
        return { isValid: false, reason: 'Polls must have at least 2 options' };
      }

      if (metadata.pollOptions.length > 10) {
        return { isValid: false, reason: 'Polls can have at most 10 options' };
      }

      if (metadata.pollOptions.some(option => option.trim().length === 0)) {
        return { isValid: false, reason: 'Poll options cannot be empty' };
      }

      if (metadata.pollOptions.some(option => option.length > 100)) {
        return { isValid: false, reason: 'Poll options cannot exceed 100 characters' };
      }
    }

    // Validate tags
    if (metadata.tags && metadata.tags.length > 10) {
      return { isValid: false, reason: 'Posts can have at most 10 tags' };
    }

    // Validate location data
    if (metadata.location) {
      const { latitude, longitude } = metadata.location;
      if (latitude < -90 || latitude > 90) {
        return { isValid: false, reason: 'Invalid latitude' };
      }
      if (longitude < -180 || longitude > 180) {
        return { isValid: false, reason: 'Invalid longitude' };
      }
    }

    return { isValid: true };
  }

  /**
   * Gets posting limits for a user
   */
  static getPostingLimits(user: User): {
    dailyLimit: number;
    commercialLimit: number;
    canCreateCommercial: boolean;
  } {
    const trustLevel = user.trustMetadata.getTrustLevel();

    return {
      dailyLimit: this.DAILY_POSTING_LIMITS[trustLevel],
      commercialLimit: this.COMMERCIAL_POSTING_LIMITS[trustLevel],
      canCreateCommercial: this.canCreateCommercialContent(user)
    };
  }

  /**
   * Determines if a user can edit a post
   */
  static canEditPost(user: User, post: Post): boolean {
    // Must be the author
    if (user.id !== post.authorId) {
      return false;
    }

    // Cannot edit deleted posts
    if (post.status === 'deleted') {
      return false;
    }

    // Enablers can edit any post
    if (user.role === UserRole.ENABLER) {
      return true;
    }

    // System users can edit system posts
    if (user.role === UserRole.SYSTEM && post.type === PostType.SYSTEM_NOTICE) {
      return true;
    }

    // Authors can edit their own posts within time limits
    const timeSinceCreation = Date.now() - post.createdAt.getTime();
    const hoursSinceCreation = timeSinceCreation / (1000 * 60 * 60);

    // Can edit within 24 hours for regular posts
    if (hoursSinceCreation <= 24) {
      return true;
    }

    // Can edit within 1 hour for questions
    if (post.type === PostType.QUESTION && hoursSinceCreation <= 1) {
      return true;
    }

    return false;
  }

  /**
   * Determines if a user can delete a post
   */
  static canDeletePost(user: User, post: Post): boolean {
    // Authors can delete their own posts
    if (user.id === post.authorId) {
      return true;
    }

    // Enablers can delete any post
    if (user.role === UserRole.ENABLER) {
      return true;
    }

    // System users can delete system posts
    if (user.role === UserRole.SYSTEM && post.type === PostType.SYSTEM_NOTICE) {
      return true;
    }

    return false;
  }

  /**
   * Gets allowed post types for a user
   */
  static getAllowedPostTypes(user: User): PostType[] {
    return this.ROLE_PERMISSIONS[user.role] || [];
  }

  /**
   * Gets allowed visibility options for a user
   */
  static getAllowedVisibilities(user: User): PostVisibility[] {
    return this.VISIBILITY_PERMISSIONS[user.role] || [];
  }

  static isCommercialPostType(postType: PostType): boolean {
    return [
      PostType.PRODUCT_ANNOUNCEMENT,
      PostType.PROMOTION
    ].includes(postType);
  }
}
