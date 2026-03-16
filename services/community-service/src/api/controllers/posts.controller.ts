import { Request, Response } from 'express';
import { CreatePostUseCase } from '../../application/use-cases/create-post.use-case';
import { IPostRepository } from '../../domain/repositories';
import { IIdGenerator } from '../../infrastructure/services/id-generator.interface';
import { FeedEngine } from '../../domain/engines/feed-engine';

/**
 * Posts API Controller
 * Handles HTTP requests for post-related operations
 */
export class PostsController {
  constructor(
    private createPostUseCase: CreatePostUseCase,
    private postRepository: IPostRepository,
    private feedEngine: FeedEngine
  ) {}

  /**
   * Create a new post
   */
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const { authorId, content, type, title, visibility, metadata } = req.body;

      // Validate required fields
      if (!authorId || !content || !type) {
        res.status(400).json({
          error: 'ValidationError',
          message: 'Missing required fields: authorId, content, type'
        });
        return;
      }

      // Execute use case
      const result = await this.createPostUseCase.execute({
        authorId,
        content,
        type,
        title,
        visibility,
        metadata
      });

      // Return appropriate response
      if (result.requiresModeration) {
        res.status(202).json({
          message: result.message,
          postId: result.postId,
          status: result.status,
          moderationRequired: true
        });
      } else {
        res.status(201).json({
          message: result.message,
          postId: result.postId,
          status: result.status
        });
      }
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to create post'
      });
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      if (!postId) {
        res.status(400).json({
          error: 'ValidationError',
          message: 'Post ID is required'
        });
        return;
      }

      const post = await this.postRepository.findById(postId);

      if (!post) {
        res.status(404).json({
          error: 'NotFoundError',
          message: 'Post not found'
        });
        return;
      }

      res.json({
        post: post.toJSON()
      });
    } catch (error) {
      console.error('Error getting post:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get post'
      });
    }
  }

  /**
   * Get posts by author
   */
  async getPostsByAuthor(req: Request, res: Response): Promise<void> {
    try {
      const { authorId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!authorId) {
        res.status(400).json({
          error: 'ValidationError',
          message: 'Author ID is required'
        });
        return;
      }

      const posts = await this.postRepository.findByAuthorId(authorId, {
        limit: Number(limit),
        offset: Number(offset)
      });

      res.json({
        posts: posts.map(post => post.toJSON()),
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          count: posts.length
        }
      });
    } catch (error) {
      console.error('Error getting posts by author:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get posts'
      });
    }
  }

  /**
   * Get published posts (feed)
   */
  async getPublishedPosts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, authorId, type, tags } = req.query;

      const options: any = {
        limit: Number(limit),
        offset: Number(offset)
      };

      if (authorId) options.authorId = authorId;
      if (type) options.type = type;
      if (tags) options.tags = Array.isArray(tags) ? tags : [tags];

      const posts = await this.postRepository.findPublished(options);

      res.json({
        posts: posts.map(post => post.toJSON()),
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          count: posts.length
        }
      });
    } catch (error) {
      console.error('Error getting published posts:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get posts'
      });
    }
  }

  /**
   * Get personalized feed for user
   */
  async getUserFeed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50, includeFollowed = true } = req.query;

      if (!userId) {
        res.status(400).json({
          error: 'ValidationError',
          message: 'User ID is required'
        });
        return;
      }

      res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: 'User feed generation requires user profile integration.'
      });
      return;
    } catch (error) {
      console.error('Error getting user feed:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get user feed'
      });
    }
  }

  /**
   * Search posts
   */
  async searchPosts(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 50, type } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'ValidationError',
          message: 'Search query is required'
        });
        return;
      }

      const posts = await this.postRepository.searchPosts(query, {
        limit: Number(limit),
        type: type as any
      });

      res.json({
        query,
        posts: posts.map(post => post.toJSON()),
        count: posts.length
      });
    } catch (error) {
      console.error('Error searching posts:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to search posts'
      });
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;

      // Get recent posts for trend analysis
      const recentPosts = await this.postRepository.findPublished({
        limit: 1000
      });

      const trendingTopics = FeedEngine.generateTrendingTopics(
        recentPosts,
        Number(hours)
      );

      res.json({
        topics: trendingTopics,
        timeWindowHours: Number(hours)
      });
    } catch (error) {
      console.error('Error getting trending topics:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get trending topics'
      });
    }
  }

  /**
   * Get related posts
   */
  async getRelatedPosts(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const { limit = 5 } = req.query;

      if (!postId) {
        res.status(400).json({
          error: 'ValidationError',
          message: 'Post ID is required'
        });
        return;
      }

      const relatedPosts = await this.postRepository.findRelatedPosts(postId, Number(limit));

      res.json({
        postId,
        relatedPosts: relatedPosts.map(post => post.toJSON()),
        count: relatedPosts.length
      });
    } catch (error) {
      console.error('Error getting related posts:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to get related posts'
      });
    }
  }
}
