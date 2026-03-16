import { Post, PostType, PostVisibility, PostMetadata, PostStatus } from '../../domain/entities/post.entity';
import { User } from '../../domain/entities/user.entity';
import { PostingPermissionsPolicy } from '../../domain/policies/posting-permissions.policy';
import { ContentModerationPolicy } from '../../domain/policies/content-moderation.policy';
import { IPostRepository } from '../../domain/repositories';
import { IIdGenerator } from '../../infrastructure/services/id-generator.interface';

/**
 * Create Post Use Case
 * Handles the business logic for creating new posts
 */
export class CreatePostUseCase {
  constructor(
    private postRepository: IPostRepository,
    private idGenerator: IIdGenerator,
    private authorProvider?: AuthorProvider,
    private postStatsProvider?: PostStatsProvider
  ) {}

  async execute(params: CreatePostInput): Promise<CreatePostOutput> {
    const { authorId, content, type, title, visibility, metadata } = params;

    // 1. Validate input
    const validation = this.validateInput(params);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    // 2. Get author (would be injected in real implementation)
    // For now, we'll assume author exists and is passed
    const author = await this.getAuthor(authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    // 3. Check posting permissions
    if (!PostingPermissionsPolicy.canCreatePostType(author, type)) {
      throw new Error('User not authorized to create this type of post');
    }

    // 4. Check daily posting limits
    const postsToday = await this.getPostsCountToday(authorId);
    if (PostingPermissionsPolicy.hasReachedDailyLimit(author, postsToday)) {
      throw new Error('Daily posting limit reached');
    }

    // 5. Check commercial posting limits
    if (PostingPermissionsPolicy.isCommercialPostType(type)) {
      const commercialPostsToday = await this.getCommercialPostsCountToday(authorId);
      if (PostingPermissionsPolicy.hasReachedCommercialLimit(author, commercialPostsToday)) {
        throw new Error('Commercial posting limit reached');
      }
    }

    // 6. Validate metadata
    if (metadata) {
      const metadataValidation = PostingPermissionsPolicy.validatePostMetadata(author, type, metadata);
      if (!metadataValidation.isValid) {
        throw new Error(metadataValidation.reason);
      }
    }

    // 7. Validate content
    const contentValidation = ContentModerationPolicy.validateContent(content, type);
    if (!contentValidation.isValid) {
      throw new Error(contentValidation.reason);
    }

    // 8. Determine if post requires moderation
    const requiresModeration = ContentModerationPolicy.requiresPreModeration(type, author, content);

    // 9. Create post
    const postId = this.idGenerator.generate();
    const postData = {
      id: postId,
      authorId,
      content,
      type,
      title,
      visibility: visibility || PostVisibility.PUBLIC,
      metadata
    };

    const post = requiresModeration
      ? Post.create(postData) // Draft status
      : Post.createPublished(postData); // Published status

    // 10. Save post
    await this.postRepository.save(post);

    // 11. Return result
    return {
      postId: post.id,
      status: post.status,
      requiresModeration,
      message: requiresModeration
        ? 'Post created and sent for moderation'
        : 'Post published successfully'
    };
  }

  private validateInput(params: CreatePostInput): { isValid: boolean; reason?: string } {
    if (!params.authorId) {
      return { isValid: false, reason: 'Author ID is required' };
    }

    if (!params.content || params.content.trim().length === 0) {
      return { isValid: false, reason: 'Content is required' };
    }

    if (!params.type) {
      return { isValid: false, reason: 'Post type is required' };
    }

    // Validate post type exists
    const validTypes = Object.values(PostType);
    if (!validTypes.includes(params.type)) {
      return { isValid: false, reason: 'Invalid post type' };
    }

    return { isValid: true };
  }

  private async getAuthor(authorId: string): Promise<User | null> {
    if (!this.authorProvider) {
      throw new Error('Author provider is not configured for post creation.');
    }
    return this.authorProvider.getAuthor(authorId);
  }

  private async getPostsCountToday(authorId: string): Promise<number> {
    if (!this.postStatsProvider) {
      throw new Error('Post stats provider is not configured for post creation.');
    }
    return this.postStatsProvider.getPostsCountToday(authorId);
  }

  private async getCommercialPostsCountToday(authorId: string): Promise<number> {
    if (!this.postStatsProvider) {
      throw new Error('Post stats provider is not configured for post creation.');
    }
    return this.postStatsProvider.getCommercialPostsCountToday(authorId);
  }
}

export interface AuthorProvider {
  getAuthor(authorId: string): Promise<User | null>;
}

export interface PostStatsProvider {
  getPostsCountToday(authorId: string): Promise<number>;
  getCommercialPostsCountToday(authorId: string): Promise<number>;
}

// Input/Output interfaces
export interface CreatePostInput {
  authorId: string;
  content: string;
  type: PostType;
  title?: string;
  visibility?: PostVisibility;
  metadata?: PostMetadata;
}

export interface CreatePostOutput {
  postId: string;
  status: PostStatus;
  requiresModeration: boolean;
  message: string;
}
