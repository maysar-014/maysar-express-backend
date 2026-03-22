import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';
import { PostsController } from '../controllers/posts.controller';
import { PrismaPostRepository } from '../../infrastructure/repositories/prisma-post.repository';
import { CreatePostUseCase } from '../../application/use-cases/create-post.use-case';
import { UuidGeneratorService } from '../../infrastructure/services/uuid-generator.service';
import { FeedEngine } from '../../domain/engines/feed-engine';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { createPostValidation } from '../middleware/validation.middleware';

/**
 * Posts API Routes
 * Defines all post-related HTTP endpoints
 */

let defaultPrisma: PrismaClient | null = null;

export function createPostsRoutes(prisma?: PrismaClient) {
  if (!defaultPrisma) {
    defaultPrisma = createPrismaClient();
  }
  const client = prisma ?? defaultPrisma;

  // Dependency injection - in real implementation, this would use a DI container
  const postRepository = new PrismaPostRepository(client);
  const idGenerator = new UuidGeneratorService();
  const createPostUseCase = new CreatePostUseCase(postRepository, idGenerator);
  const feedEngine = new FeedEngine(); // Static methods, but created for consistency
  const postsController = new PostsController(createPostUseCase, postRepository, feedEngine);

  const router = Router();

/**
 * POST /api/posts
 * Create a new post
 */
  router.post('/', requireAuth, createPostValidation, postsController.createPost.bind(postsController));

/**
 * GET /api/posts/published
 * Get published posts (global feed)
 */
  router.get('/published', postsController.getPublishedPosts.bind(postsController));

/**
 * GET /api/posts/search
 * Search posts
 */
  router.get('/search', postsController.searchPosts.bind(postsController));

/**
 * GET /api/posts/trending
 * Get trending topics
 */
  router.get('/trending', postsController.getTrendingTopics.bind(postsController));

/**
 * GET /api/posts/:postId
 * Get a specific post by ID
 */
  router.get('/:postId', postsController.getPost.bind(postsController));

/**
 * GET /api/posts/:postId/related
 * Get posts related to the specified post
 */
  router.get('/:postId/related', postsController.getRelatedPosts.bind(postsController));

/**
 * GET /api/users/:authorId/posts
 * Get posts by a specific author
 */
  router.get('/authors/:authorId', postsController.getPostsByAuthor.bind(postsController));

/**
 * GET /api/users/:userId/feed
 * Get personalized feed for a user
 */
  router.get('/users/:userId/feed', requireAuth, postsController.getUserFeed.bind(postsController));

  return router;
}

export const postsRoutes = createPostsRoutes();
