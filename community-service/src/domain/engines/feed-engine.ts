import { User } from '../entities/user.entity';
import { Post, PostType, PostVisibility } from '../entities/post.entity';

/**
 * Feed item with ranking score
 */
export interface FeedItem {
  post: Post;
  score: number;
  reasons: string[];
}

/**
 * Feed generation and content ranking engine
 * Implements algorithmic logic for personalized content feeds
 */
export class FeedEngine {
  // Scoring weights for different factors
  private static readonly SCORING_WEIGHTS = {
    recency: 0.3,
    engagement: 0.25,
    authorTrust: 0.2,
    relevance: 0.15,
    contentQuality: 0.1
  };

  // Time decay factors (hours)
  private static readonly TIME_DECAY_HOURS = {
    [PostType.TEXT]: 24,
    [PostType.IMAGE]: 48,
    [PostType.VIDEO]: 72,
    [PostType.LINK]: 24,
    [PostType.POLL]: 48,
    [PostType.EVENT]: 168, // 1 week
    [PostType.PRODUCT_ANNOUNCEMENT]: 72,
    [PostType.PROMOTION]: 48,
    [PostType.QUESTION]: 12,
    [PostType.DELIVERY_UPDATE]: 6,
    [PostType.DISPUTE_CLARIFICATION]: 24,
    [PostType.SYSTEM_NOTICE]: 168 // 1 week
  };

  /**
   * Generates a personalized feed for a user
   */
  static generateFeed(
    user: User,
    availablePosts: Post[],
    options: {
      limit?: number;
      includeFollowed?: boolean;
      preferredTypes?: PostType[];
      excludeTypes?: PostType[];
    } = {}
  ): FeedItem[] {
    const { limit = 50, includeFollowed = true, preferredTypes, excludeTypes } = options;

    // Filter posts based on visibility and user permissions
    let filteredPosts = availablePosts.filter(post =>
      this.isPostVisibleToUser(post, user)
    );

    // Apply type filters
    if (preferredTypes && preferredTypes.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        preferredTypes.includes(post.type)
      );
    }

    if (excludeTypes && excludeTypes.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        !excludeTypes.includes(post.type)
      );
    }

    // Score and rank posts
    const scoredItems = filteredPosts.map(post => ({
      post,
      score: this.calculatePostScore(post, user),
      reasons: this.getScoringReasons(post, user)
    }));

    // Sort by score (descending)
    scoredItems.sort((a, b) => b.score - a.score);

    // Return top items
    return scoredItems.slice(0, limit);
  }

  /**
   * Calculates comprehensive score for a post
   */
  static calculatePostScore(post: Post, user: User): number {
    const recencyScore = this.calculateRecencyScore(post);
    const engagementScore = this.calculateEngagementScore(post);
    const authorTrustScore = this.calculateAuthorTrustScore(post);
    const relevanceScore = this.calculateRelevanceScore(post, user);
    const contentQualityScore = this.calculateContentQualityScore(post);

    const weights = this.SCORING_WEIGHTS;

    return (
      recencyScore * weights.recency +
      engagementScore * weights.engagement +
      authorTrustScore * weights.authorTrust +
      relevanceScore * weights.relevance +
      contentQualityScore * weights.contentQuality
    );
  }

  /**
   * Calculates recency score based on post age and type
   */
  private static calculateRecencyScore(post: Post): number {
    const publishedAt = post.publishedAt || post.createdAt;
    const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    const decayHours = this.TIME_DECAY_HOURS[post.type];

    if (hoursSincePublished <= 0) {
      return 1.0; // Just published
    }

    if (hoursSincePublished >= decayHours) {
      return 0.1; // Fully decayed
    }

    // Exponential decay
    const decayFactor = Math.exp(-hoursSincePublished / (decayHours / 3));
    return Math.max(0.1, decayFactor);
  }

  /**
   * Calculates engagement score based on likes, comments, shares
   */
  private static calculateEngagementScore(post: Post): number {
    // This would typically come from actual engagement data
    // For now, using placeholder calculations
    const likesWeight = 0.4;
    const commentsWeight = 0.4;
    const sharesWeight = 0.2;

    // Normalize engagement metrics (assuming max values for scaling)
    const normalizedLikes = Math.min(post.likesCount / 100, 1);
    const normalizedComments = Math.min(post.commentsCount / 50, 1);
    const normalizedShares = Math.min(post.sharesCount / 20, 1);

    return (
      normalizedLikes * likesWeight +
      normalizedComments * commentsWeight +
      normalizedShares * sharesWeight
    );
  }

  /**
   * Calculates author trust score based on reputation and verification
   */
  private static calculateAuthorTrustScore(post: Post): number {
    // This would need author data - placeholder for now
    // In real implementation, this would access author trust metadata
    const baseScore = post.isFeatured ? 0.9 : 0.5;
    const verificationBonus = 0.2; // If author is verified
    const reputationBonus = 0.3; // Based on author reputation

    return Math.min(1.0, baseScore + verificationBonus + reputationBonus);
  }

  /**
   * Calculates relevance score based on user preferences and behavior
   */
  private static calculateRelevanceScore(post: Post, user: User): number {
    let relevanceScore = 0.5; // Base relevance

    // Boost score for posts from user's region (if location data available)
    if (post.metadata?.location && user.location) {
      // Simple distance-based relevance (placeholder)
      relevanceScore += 0.1;
    }

    // Boost score for posts with user's preferred tags
    if (post.getTags().length > 0) {
      // In real implementation, check against user's interests
      relevanceScore += 0.1;
    }

    // Boost score for commercial content if user is buyer/seller
    if (post.isCommercialPost()) {
      if (user.role === 'buyer' || user.role === 'seller') {
        relevanceScore += 0.2;
      }
    }

    // Boost score for delivery updates if user is courier
    if (post.type === PostType.DELIVERY_UPDATE && user.role === 'courier') {
      relevanceScore += 0.3;
    }

    return Math.min(1.0, relevanceScore);
  }

  /**
   * Calculates content quality score based on various factors
   */
  private static calculateContentQualityScore(post: Post): number {
    let qualityScore = 0.5; // Base quality

    // Content length appropriateness
    const contentLength = post.content.length;
    if (this.isAppropriateLength(post.type, contentLength)) {
      qualityScore += 0.1;
    }

    // Has media attachments for visual posts
    if ([PostType.IMAGE, PostType.VIDEO].includes(post.type)) {
      // In real implementation, check if media is attached
      qualityScore += 0.1;
    }

    // Has structured metadata for special post types
    if (post.type === PostType.EVENT && post.metadata?.eventDetails) {
      qualityScore += 0.1;
    }

    if (post.type === PostType.POLL && post.metadata?.pollOptions) {
      qualityScore += 0.1;
    }

    // Pinned or featured posts get quality boost
    if (post.isPinned || post.isFeatured) {
      qualityScore += 0.2;
    }

    return Math.min(1.0, qualityScore);
  }

  /**
   * Determines if a post is visible to a specific user
   */
  private static isPostVisibleToUser(post: Post, user: User): boolean {
    return post.isVisibleToUser(user.id, post.authorId, false); // Placeholder for follower check
  }

  /**
   * Gets human-readable reasons for the post's score
   */
  private static getScoringReasons(post: Post, user: User): string[] {
    const reasons: string[] = [];

    const publishedAt = post.publishedAt || post.createdAt;
    const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSincePublished < 1) {
      reasons.push('Very recent post');
    } else if (hoursSincePublished < 24) {
      reasons.push('Posted today');
    }

    if (post.likesCount > 10) {
      reasons.push('Highly liked');
    }

    if (post.commentsCount > 5) {
      reasons.push('Active discussion');
    }

    if (post.isFeatured) {
      reasons.push('Featured content');
    }

    if (post.isPinned) {
      reasons.push('Pinned post');
    }

    if (post.isCommercialPost()) {
      reasons.push('Commercial content');
    }

    if (post.type === PostType.QUESTION) {
      reasons.push('Helpful question');
    }

    return reasons;
  }

  /**
   * Checks if content length is appropriate for the post type
   */
  private static isAppropriateLength(postType: PostType, length: number): boolean {
    const lengthRanges = {
      [PostType.TEXT]: { min: 10, max: 5000 },
      [PostType.IMAGE]: { min: 0, max: 1000 },
      [PostType.VIDEO]: { min: 0, max: 500 },
      [PostType.LINK]: { min: 10, max: 1000 },
      [PostType.POLL]: { min: 10, max: 1000 },
      [PostType.EVENT]: { min: 50, max: 2000 },
      [PostType.PRODUCT_ANNOUNCEMENT]: { min: 50, max: 3000 },
      [PostType.PROMOTION]: { min: 50, max: 2000 },
      [PostType.QUESTION]: { min: 10, max: 1000 },
      [PostType.DELIVERY_UPDATE]: { min: 10, max: 500 },
      [PostType.DISPUTE_CLARIFICATION]: { min: 50, max: 2000 },
      [PostType.SYSTEM_NOTICE]: { min: 10, max: 1000 }
    };

    const range = lengthRanges[postType];
    return length >= range.min && length <= range.max;
  }

  /**
   * Generates trending topics based on recent post activity
   */
  static generateTrendingTopics(posts: Post[], timeWindowHours: number = 24): Array<{ tag: string; score: number; postCount: number }> {
    const cutoffTime = new Date(Date.now() - (timeWindowHours * 60 * 60 * 1000));

    const tagStats = new Map<string, { count: number; totalEngagement: number }>();

    posts
      .filter(post => (post.publishedAt || post.createdAt) > cutoffTime)
      .forEach(post => {
        const tags = post.getTags();
        const engagement = post.likesCount + post.commentsCount * 2 + post.sharesCount * 3;

        tags.forEach(tag => {
          const current = tagStats.get(tag) || { count: 0, totalEngagement: 0 };
          tagStats.set(tag, {
            count: current.count + 1,
            totalEngagement: current.totalEngagement + engagement
          });
        });
      });

    return Array.from(tagStats.entries())
      .map(([tag, stats]) => ({
        tag,
        score: stats.count * 0.6 + stats.totalEngagement * 0.4,
        postCount: stats.count
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Top 20 trending topics
  }

  /**
   * Finds similar posts based on tags, type, and content
   */
  static findSimilarPosts(targetPost: Post, candidatePosts: Post[], limit: number = 5): Array<{ post: Post; similarity: number }> {
    return candidatePosts
      .filter(post => post.id !== targetPost.id)
      .map(post => ({
        post,
        similarity: this.calculateSimilarity(targetPost, post)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculates similarity between two posts
   */
  private static calculateSimilarity(post1: Post, post2: Post): number {
    let similarity = 0;

    // Same post type
    if (post1.type === post2.type) {
      similarity += 0.3;
    }

    // Common tags
    const tags1 = new Set(post1.getTags());
    const tags2 = new Set(post2.getTags());
    const commonTags = new Set([...tags1].filter(tag => tags2.has(tag)));
    const tagSimilarity = commonTags.size / Math.max(tags1.size, tags2.size, 1);
    similarity += tagSimilarity * 0.4;

    // Same author (slight boost for consistency)
    if (post1.authorId === post2.authorId) {
      similarity += 0.1;
    }

    // Same visibility
    if (post1.visibility === post2.visibility) {
      similarity += 0.1;
    }

    // Commercial content similarity
    if (post1.isCommercialPost() === post2.isCommercialPost()) {
      similarity += 0.1;
    }

    return Math.min(1.0, similarity);
  }
}
