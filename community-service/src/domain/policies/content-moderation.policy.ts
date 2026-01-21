import { User, UserRole } from '../entities/user.entity';
import { Post, PostType, PostStatus } from '../entities/post.entity';

/**
 * Content moderation policy
 * Defines rules for content approval, flagging, and moderation
 */
export class ContentModerationPolicy {
  // Content that requires pre-moderation
  private static readonly REQUIRES_PRE_MODERATION: PostType[] = [
    PostType.PRODUCT_ANNOUNCEMENT,
    PostType.PROMOTION,
    PostType.EVENT,
    PostType.SYSTEM_NOTICE
  ];

  // Content that is auto-approved for verified users
  private static readonly AUTO_APPROVED_FOR_VERIFIED: PostType[] = [
    PostType.TEXT,
    PostType.IMAGE,
    PostType.VIDEO,
    PostType.LINK,
    PostType.QUESTION
  ];

  // Keywords that trigger content review
  private static readonly SUSPICIOUS_KEYWORDS = [
    'scam', 'fraud', 'fake', 'counterfeit', 'stolen',
    'hack', 'crack', 'exploit', 'malware', 'virus',
    'drugs', 'weapons', 'illegal', 'prohibited'
  ];

  // Commercial keywords that require verification
  private static readonly COMMERCIAL_KEYWORDS = [
    'buy', 'sell', 'purchase', 'price', 'discount', 'deal',
    'offer', 'sale', 'discount', 'coupon', 'voucher'
  ];

  /**
   * Determines if content requires pre-moderation
   */
  static requiresPreModeration(postType: PostType, author: User, content: string): boolean {
    // System posts are always pre-moderated
    if (postType === PostType.SYSTEM_NOTICE) {
      return true;
    }

    // Commercial posts require moderation
    if (this.REQUIRES_PRE_MODERATION.includes(postType)) {
      return true;
    }

    // Check for suspicious content
    if (this.containsSuspiciousContent(content)) {
      return true;
    }

    // Commercial keywords in non-commercial posts
    if (!this.isCommercialPostType(postType) && this.containsCommercialContent(content)) {
      return true;
    }

    // Unverified users get stricter moderation
    if (!author.isVerified && postType === PostType.PROMOTION) {
      return true;
    }

    return false;
  }

  /**
   * Determines if content can be auto-approved
   */
  static canBeAutoApproved(postType: PostType, author: User, content: string): boolean {
    // Pre-moderated content cannot be auto-approved
    if (this.requiresPreModeration(postType, author, content)) {
      return false;
    }

    // Only verified users can have auto-approval for certain content
    if (!author.isVerified) {
      return this.AUTO_APPROVED_FOR_VERIFIED.includes(postType) && !this.containsSuspiciousContent(content);
    }

    return true;
  }

  /**
   * Checks if content contains suspicious keywords
   */
  static containsSuspiciousContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.SUSPICIOUS_KEYWORDS.some(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  /**
   * Checks if content appears commercial
   */
  static containsCommercialContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.COMMERCIAL_KEYWORDS.some(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  /**
   * Determines moderation priority
   */
  static getModerationPriority(postType: PostType, author: User, content: string): 'low' | 'medium' | 'high' | 'critical' {
    // Critical priority for system notices
    if (postType === PostType.SYSTEM_NOTICE) {
      return 'critical';
    }

    // High priority for commercial content or suspicious content
    if (this.isCommercialPostType(postType) || this.containsSuspiciousContent(content)) {
      return 'high';
    }

    // Medium priority for events
    if (postType === PostType.EVENT) {
      return 'medium';
    }

    // Low priority for regular content
    return 'low';
  }

  /**
   * Determines if a user can moderate content
   */
  static canUserModerate(user: User, post: Post): boolean {
    // Only enablers and system users can moderate
    if (user.role !== UserRole.ENABLER && user.role !== UserRole.SYSTEM) {
      return false;
    }

    // Cannot moderate own content
    if (user.id === post.authorId) {
      return false;
    }

    // System users can moderate everything
    if (user.role === UserRole.SYSTEM) {
      return true;
    }

    // Enablers cannot moderate system posts
    if (post.type === PostType.SYSTEM_NOTICE) {
      return false;
    }

    return true;
  }

  /**
   * Gets recommended moderation action
   */
  static getRecommendedAction(postType: PostType, author: User, content: string): 'approve' | 'reject' | 'flag' | 'escalate' {
    // Auto-approve safe content from verified users
    if (this.canBeAutoApproved(postType, author, content)) {
      return 'approve';
    }

    // Escalate suspicious content
    if (this.containsSuspiciousContent(content)) {
      return 'escalate';
    }

    // Flag commercial content from unverified users
    if (this.isCommercialPostType(postType) && !author.isVerified) {
      return 'flag';
    }

    // Reject system notices from non-system users
    if (postType === PostType.SYSTEM_NOTICE && author.role !== UserRole.SYSTEM) {
      return 'reject';
    }

    // Default to flag for manual review
    return 'flag';
  }

  /**
   * Validates content length and format
   */
  static validateContent(content: string, postType: PostType): { isValid: boolean; reason?: string } {
    // Check minimum length
    if (content.trim().length < 10) {
      return { isValid: false, reason: 'Content too short (minimum 10 characters)' };
    }

    // Check maximum length based on post type
    const maxLengths = {
      [PostType.TEXT]: 5000,
      [PostType.IMAGE]: 1000,
      [PostType.VIDEO]: 500,
      [PostType.LINK]: 1000,
      [PostType.POLL]: 1000,
      [PostType.EVENT]: 2000,
      [PostType.PRODUCT_ANNOUNCEMENT]: 3000,
      [PostType.PROMOTION]: 2000,
      [PostType.QUESTION]: 1000,
      [PostType.DELIVERY_UPDATE]: 500,
      [PostType.DISPUTE_CLARIFICATION]: 2000,
      [PostType.SYSTEM_NOTICE]: 1000
    };

    const maxLength = maxLengths[postType] || 1000;
    if (content.length > maxLength) {
      return { isValid: false, reason: `Content too long (maximum ${maxLength} characters)` };
    }

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3 && content.length > 50) {
      return { isValid: false, reason: 'Too many capital letters' };
    }

    return { isValid: true };
  }

  private static isCommercialPostType(postType: PostType): boolean {
    return [
      PostType.PRODUCT_ANNOUNCEMENT,
      PostType.PROMOTION
    ].includes(postType);
  }
}
