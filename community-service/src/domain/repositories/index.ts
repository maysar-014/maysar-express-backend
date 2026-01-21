// Domain Repository Interfaces
// These define contracts that infrastructure must implement

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<void>;
  updateTrustMetadata(userId: string, metadata: TrustMetadata): Promise<void>;
  findByRole(role: UserRole): Promise<User[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;
}

export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findByAuthorId(authorId: string, options?: { limit?: number; offset?: number }): Promise<Post[]>;
  findPublished(options?: {
    limit?: number;
    offset?: number;
    authorId?: string;
    type?: PostType;
    tags?: string[];
  }): Promise<Post[]>;
  save(post: Post): Promise<void>;
  update(post: Post): Promise<void>;
  delete(id: string): Promise<void>;
  findRelatedPosts(postId: string, limit?: number): Promise<Post[]>;
  getPostsByIds(ids: string[]): Promise<Post[]>;
  searchPosts(query: string, options?: { limit?: number; type?: PostType }): Promise<Post[]>;
}

export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findByPostId(postId: string, options?: { limit?: number; offset?: number }): Promise<Comment[]>;
  findByAuthorId(authorId: string, options?: { limit?: number; offset?: number }): Promise<Comment[]>;
  save(comment: Comment): Promise<void>;
  update(comment: Comment): Promise<void>;
  delete(id: string): Promise<void>;
  getReplies(parentId: string): Promise<Comment[]>;
}

export interface ILikeRepository {
  findByUserAndEntity(userId: string, entityType: 'post' | 'comment', entityId: string): Promise<Like | null>;
  findByEntity(entityType: 'post' | 'comment', entityId: string): Promise<Like[]>;
  save(like: Like): Promise<void>;
  delete(id: string): Promise<void>;
  countByEntity(entityType: 'post' | 'comment', entityId: string): Promise<number>;
}

export interface IFollowRepository {
  findByUsers(followerId: string, followingId: string): Promise<Follow | null>;
  findFollowers(userId: string): Promise<User[]>;
  findFollowing(userId: string): Promise<User[]>;
  save(follow: Follow): Promise<void>;
  delete(followerId: string, followingId: string): Promise<void>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
}

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findPendingReports(): Promise<Report[]>;
  findByEntity(entityType: string, entityId: string): Promise<Report[]>;
  save(report: Report): Promise<void>;
  update(report: Report): Promise<void>;
}

// Import entities for type definitions
import { User, UserRole } from '../entities/user.entity';
import { Post, PostType } from '../entities/post.entity';
import { TrustMetadata } from '../value-objects/trust-metadata.value-object';

// Additional entity imports that will be created
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  likesCount: number;
  repliesCount: number;
  status: 'published' | 'hidden' | 'deleted';
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  type: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
  createdAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'copyright_violation' | 'hate_speech' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
}
