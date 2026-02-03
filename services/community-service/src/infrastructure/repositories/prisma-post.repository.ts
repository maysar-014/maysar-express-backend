import { PrismaClient } from '@prisma/client';
import { Post, PostType, PostVisibility, PostStatus } from '../../domain/entities/post.entity';
import { IPostRepository } from '../../domain/repositories';

/**
 * Prisma implementation of Post repository
 * Adapts Prisma ORM to Domain repository interface
 */
export class PrismaPostRepository implements IPostRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Post | null> {
    const postData = await this.prisma.post.findUnique({
      where: { id }
    });

    if (!postData) {
      return null;
    }

    // Convert database model to domain entity
    return this.mapToDomainEntity(postData);
  }

  async findByAuthorId(authorId: string, options?: { limit?: number; offset?: number }): Promise<Post[]> {
    const { limit = 50, offset = 0 } = options || {};

    const postsData = await this.prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return postsData.map(postData => this.mapToDomainEntity(postData));
  }

  async findPublished(options?: {
    limit?: number;
    offset?: number;
    authorId?: string;
    type?: PostType;
    tags?: string[];
  }): Promise<Post[]> {
    const { limit = 50, offset = 0, authorId, type, tags } = options || {};

    // Build where clause
    const where: any = {
      status: PostStatus.PUBLISHED,
      publishedAt: { not: null }
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (type) {
      where.type = type;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }

    const postsData = await this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return postsData.map(postData => this.mapToDomainEntity(postData));
  }

  async save(post: Post): Promise<void> {
    const postData = this.mapToPrismaData(post);

    await this.prisma.post.upsert({
      where: { id: post.id },
      update: postData,
      create: postData
    });
  }

  async update(post: Post): Promise<void> {
    const postData = this.mapToPrismaData(post);

    await this.prisma.post.update({
      where: { id: post.id },
      data: postData
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.update({
      where: { id },
      data: {
        status: PostStatus.DELETED,
        updatedAt: new Date()
      }
    });
  }

  async findRelatedPosts(postId: string, limit: number = 5): Promise<Post[]> {
    // Get the original post
    const originalPost = await this.findById(postId);
    if (!originalPost) {
      return [];
    }

    // Find posts with similar tags, type, or author
    const relatedPostsData = await this.prisma.post.findMany({
      where: {
        id: { not: postId },
        status: PostStatus.PUBLISHED,
        OR: [
          // Same type
          { type: originalPost.type },
          // Common tags
          originalPost.getTags().length > 0 ? {
            tags: { hasSome: originalPost.getTags() }
          } : {},
          // Same author (other posts)
          { authorId: originalPost.authorId, id: { not: postId } }
        ].filter(condition => Object.keys(condition).length > 0)
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return relatedPostsData.map(postData => this.mapToDomainEntity(postData));
  }

  async getPostsByIds(ids: string[]): Promise<Post[]> {
    const postsData = await this.prisma.post.findMany({
      where: {
        id: { in: ids },
        status: { not: PostStatus.DELETED }
      },
      orderBy: { createdAt: 'desc' }
    });

    return postsData.map(postData => this.mapToDomainEntity(postData));
  }

  async searchPosts(query: string, options?: { limit?: number; type?: PostType }): Promise<Post[]> {
    const { limit = 50, type } = options || {};

    const where: any = {
      status: PostStatus.PUBLISHED,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } }
      ]
    };

    if (type) {
      where.type = type;
    }

    const postsData = await this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return postsData.map(postData => this.mapToDomainEntity(postData));
  }

  // Private mapping methods
  private mapToDomainEntity(postData: any): Post {
    // Convert Prisma data to domain entity
    const post = Post.createPublished({
      id: postData.id,
      authorId: postData.authorId,
      content: postData.content,
      type: postData.type as PostType,
      title: postData.title,
      visibility: postData.visibility as PostVisibility,
      metadata: postData.metadata ? JSON.parse(JSON.stringify(postData.metadata)) : undefined
    });

    // Apply additional state
    if (postData.status === PostStatus.HIDDEN) {
      post.hide();
    }

    if (postData.isPinned) {
      post.pin();
    }

    if (postData.isFeatured) {
      post.feature();
    }

    if (postData.moderatedBy) {
      post.moderate(postData.moderatedBy, postData.moderationReason);
    }

    return post;
  }

  private mapToPrismaData(post: Post): any {
    return {
      id: post.id,
      authorId: post.authorId,
      title: post.title,
      content: post.content,
      type: post.type,
      visibility: post.visibility,
      metadata: post.metadata,
      status: post.status,
      isPinned: post.isPinned,
      isFeatured: post.isFeatured,
      publishedAt: post.publishedAt,
      moderatedBy: post.moderatedBy,
      moderatedAt: post.moderatedAt,
      moderationReason: post.moderationReason,
      updatedAt: new Date()
    };
  }
}
