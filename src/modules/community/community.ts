import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { eventBus } from '../../events/eventBus'

export enum PostPrivacy {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private'
}

export enum PostStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  REPORTED = 'reported',
  DELETED = 'deleted'
}

export enum CommentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  REPORTED = 'reported',
  DELETED = 'deleted'
}

export interface CreatePostRequest {
  authorId: string
  content: string
  mediaUrls?: string[]
  tags?: string[]
  privacy?: PostPrivacy
  isPinned?: boolean
}

export interface UpdatePostRequest {
  content?: string
  mediaUrls?: string[]
  tags?: string[]
  privacy?: PostPrivacy
  isPinned?: boolean
}

export interface CreateCommentRequest {
  postId: string
  authorId: string
  content: string
  parentCommentId?: string
}

export interface UpdateCommentRequest {
  content: string
}

export interface FeedFilters {
  userId?: string // For personalized feed
  followedOnly?: boolean
  includeOwnPosts?: boolean
  tags?: string[]
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending'
}

export interface PostSearchFilters {
  query?: string
  authorId?: string
  tags?: string[]
  privacy?: PostPrivacy
  status?: PostStatus
  fromDate?: Date
  toDate?: Date
  sortBy?: 'newest' | 'oldest' | 'popular'
}

export interface CommunityAnalytics {
  totalPosts: number
  totalComments: number
  totalLikes: number
  totalShares: number
  activeUsers: number
  topTags: Array<{ tag: string; count: number }>
  engagementRate: number
  postsPerDay: number
  commentsPerDay: number
}

export class CommunityService {
  constructor() {
    // Initialize trending tags cache
    this.initializeTrendingTags()
  }

  // Post Management
  async createPost(request: CreatePostRequest): Promise<any> {
    const {
      authorId,
      content,
      mediaUrls = [],
      tags = [],
      privacy = PostPrivacy.PUBLIC,
      isPinned = false
    } = request

    // Validate user exists
    const user = await (prisma as any).user.findUnique({
      where: { id: authorId },
      select: { id: true, isActive: true }
    })

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    // Create post
    const post = await (prisma as any).post.create({
      data: {
        authorId,
        content,
        mediaUrls,
        tags,
        privacy,
        isPinned,
        status: PostStatus.ACTIVE
      }
    })

    // Update tag counts
    await this.updateTagCounts(tags, 1)

    // Get post with author info
    const postWithAuthor = await this.getPostWithAuthor(post.id)

    return postWithAuthor
  }

  async getPostById(postId: string, currentUserId?: string): Promise<any> {
    const post = await (prisma as any).post.findUnique({
      where: { id: postId },
      include: {
        comments: {
          where: { status: CommentStatus.ACTIVE, parentCommentId: null },
          include: {
            replies: {
              where: { status: CommentStatus.ACTIVE },
              include: {
                _count: { select: { replies: true } }
              }
            },
            _count: { select: { likedBy: true, replies: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 3 // Recent comments
        },
        _count: { select: { comments: true } }
      }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    // Check privacy
    if (!this.canViewPost(post, currentUserId)) {
      throw new Error('Post not accessible')
    }

    // Increment view count
    await (prisma as any).post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } }
    })

    return this.enrichPostWithAuthor(post, currentUserId)
  }

  async updatePost(postId: string, authorId: string, updates: UpdatePostRequest): Promise<any> {
    const post = await (prisma as any).post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.authorId !== authorId) {
      throw new Error('Unauthorized to update this post')
    }

    // Update tag counts (remove old tags, add new ones)
    if (updates.tags) {
      await this.updateTagCounts(post.tags, -1)
      await this.updateTagCounts(updates.tags, 1)
    }

    const updatedPost = await (prisma as any).post.update({
      where: { id: postId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })

    return this.getPostWithAuthor(updatedPost.id)
  }

  async deletePost(postId: string, authorId: string): Promise<void> {
    const post = await (prisma as any).post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.authorId !== authorId) {
      throw new Error('Unauthorized to delete this post')
    }

    // Soft delete
    await (prisma as any).post.update({
      where: { id: postId },
      data: {
        status: PostStatus.DELETED,
        updatedAt: new Date()
      }
    })

    // Update tag counts
    await this.updateTagCounts(post.tags, -1)
  }

  async toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await (prisma as any).post.findUnique({
      where: { id: postId },
      select: { likedBy: true, authorId: true }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const isLiked = post.likedBy.includes(userId)
    let newLikedBy: string[]

    if (isLiked) {
      // Unlike
      newLikedBy = post.likedBy.filter(id => id !== userId)
    } else {
      // Like
      newLikedBy = [...post.likedBy, userId]
    }

    await (prisma as any).post.update({
      where: { id: postId },
      data: { likedBy: newLikedBy }
    })

    return {
      liked: !isLiked,
      likeCount: newLikedBy.length
    }
  }

  async savePost(postId: string, userId: string): Promise<boolean> {
    const existingSave = await (prisma as any).userSavedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    })

    if (existingSave) {
      // Unsave
      await (prisma as any).userSavedPost.delete({
        where: { id: existingSave.id }
      })
      return false
    } else {
      // Save
      await (prisma as any).userSavedPost.create({
        data: { userId, postId }
      })
      return true
    }
  }

  async getSavedPosts(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const savedPosts = await (prisma as any).userSavedPost.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            comments: {
              where: { status: CommentStatus.ACTIVE },
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const posts = savedPosts.map(sp => this.enrichPostWithAuthor(sp.post, userId))

    return {
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    }
  }

  async getFeedPosts(filters: FeedFilters = {}, page: number = 1, limit: number = 20): Promise<any> {
    const { userId, followedOnly = false, includeOwnPosts = true, tags, sortBy = 'newest' } = filters

    let where: any = {
      status: PostStatus.ACTIVE
    }

    // Privacy filtering
    if (userId) {
      where.OR = [
        { privacy: PostPrivacy.PUBLIC },
        { authorId: userId } // Always show own posts
      ]

      if (followedOnly) {
        // In a real implementation, you'd check follower relationships
        // For now, just show public posts
        where.privacy = PostPrivacy.PUBLIC
      }
    } else {
      // No user context, only public posts
      where.privacy = PostPrivacy.PUBLIC
    }

    // Tag filtering
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      }
    }

    // Sorting
    let orderBy: any
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'popular':
        orderBy = [
          { likedBy: { _count: 'desc' } },
          { commentCount: 'desc' },
          { createdAt: 'desc' }
        ]
        break
      case 'trending':
        // Simple trending algorithm: recent + engagement
        orderBy = [
          { createdAt: 'desc' },
          { likedBy: { _count: 'desc' } }
        ]
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const posts = await (prisma as any).post.findMany({
      where,
      include: {
        comments: {
          where: { status: CommentStatus.ACTIVE, parentCommentId: null },
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            replies: {
              take: 2,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })

    // Enrich posts with author info and user context
    const enrichedPosts = await Promise.all(
      posts.map(post => this.enrichPostWithAuthor(post, userId))
    )

    return {
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    }
  }

  async searchPosts(filters: PostSearchFilters, page: number = 1, limit: number = 20): Promise<any> {
    const { query, authorId, tags, privacy, status, fromDate, toDate, sortBy = 'newest' } = filters

    let where: any = {}

    // Text search
    if (query) {
      where.OR = [
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } }
      ]
    }

    // Filters
    if (authorId) where.authorId = authorId
    if (tags && tags.length > 0) where.tags = { hasSome: tags }
    if (privacy) where.privacy = privacy
    if (status) where.status = status

    // Date range
    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = fromDate
      if (toDate) where.createdAt.lte = toDate
    }

    // Sorting
    let orderBy: any
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'popular':
        orderBy = [
          { likedBy: { _count: 'desc' } },
          { commentCount: 'desc' }
        ]
        break
    }

    const posts = await (prisma as any).post.findMany({
      where,
      include: {
        comments: {
          where: { status: CommentStatus.ACTIVE },
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await (prisma as any).post.count({ where })

    return {
      posts: posts.map(post => this.enrichPostWithAuthor(post)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getUserPosts(userId: string, currentUserId?: string, page: number = 1, limit: number = 20): Promise<any> {
    // Check if current user can view this user's posts
    const canViewPrivate = currentUserId === userId

    let where: any = {
      authorId: userId,
      status: PostStatus.ACTIVE
    }

    if (!canViewPrivate) {
      where.privacy = PostPrivacy.PUBLIC
    }

    const posts = await (prisma as any).post.findMany({
      where,
      include: {
        comments: {
          where: { status: CommentStatus.ACTIVE },
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const enrichedPosts = await Promise.all(
      posts.map(post => this.enrichPostWithAuthor(post, currentUserId))
    )

    return {
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    }
  }

  // Comment Management
  async createComment(request: CreateCommentRequest): Promise<any> {
    const { postId, authorId, content, parentCommentId } = request

    // Validate post exists and is accessible
    const post = await (prisma as any).post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true }
    })

    if (!post || post.status !== PostStatus.ACTIVE) {
      throw new Error('Post not found or not accessible')
    }

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentComment = await (prisma as any).comment.findUnique({
        where: { id: parentCommentId },
        select: { id: true, postId: true }
      })

      if (!parentComment || parentComment.postId !== postId) {
        throw new Error('Parent comment not found or belongs to different post')
      }
    }

    const comment = await (prisma as any).comment.create({
      data: {
        postId,
        authorId,
        content,
        parentCommentId,
        status: CommentStatus.ACTIVE
      }
    })

    // Update comment counts
    if (parentCommentId) {
      // Increment reply count on parent
      await (prisma as any).comment.update({
        where: { id: parentCommentId },
        data: { replyCount: { increment: 1 } }
      })
    } else {
      // Increment comment count on post
      await (prisma as any).post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } }
      })
    }

    return this.getCommentWithAuthor(comment.id)
  }

  async updateComment(commentId: string, authorId: string, updates: UpdateCommentRequest): Promise<any> {
    const comment = await (prisma as any).comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.authorId !== authorId) {
      throw new Error('Unauthorized to update this comment')
    }

    const updatedComment = await (prisma as any).comment.update({
      where: { id: commentId },
      data: {
        ...updates,
        isEdited: true,
        updatedAt: new Date()
      }
    })

    return this.getCommentWithAuthor(updatedComment.id)
  }

  async deleteComment(commentId: string, authorId: string): Promise<void> {
    const comment = await (prisma as any).comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true, parentCommentId: true }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    if (comment.authorId !== authorId) {
      throw new Error('Unauthorized to delete this comment')
    }

    // Soft delete
    await (prisma as any).comment.update({
      where: { id: commentId },
      data: { status: CommentStatus.DELETED }
    })

    // Update counts
    if (comment.parentCommentId) {
      await (prisma as any).comment.update({
        where: { id: comment.parentCommentId },
        data: { replyCount: { decrement: 1 } }
      })
    } else {
      await (prisma as any).post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } }
      })
    }
  }

  async toggleLikeComment(commentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const comment = await (prisma as any).comment.findUnique({
      where: { id: commentId },
      select: { likedBy: true }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    const isLiked = comment.likedBy.includes(userId)
    let newLikedBy: string[]

    if (isLiked) {
      newLikedBy = comment.likedBy.filter(id => id !== userId)
    } else {
      newLikedBy = [...comment.likedBy, userId]
    }

    await (prisma as any).comment.update({
      where: { id: commentId },
      data: { likedBy: newLikedBy }
    })

    return {
      liked: !isLiked,
      likeCount: newLikedBy.length
    }
  }

  async getPostComments(postId: string, currentUserId?: string, page: number = 1, limit: number = 20): Promise<any> {
    const comments = await (prisma as any).comment.findMany({
      where: {
        postId,
        status: CommentStatus.ACTIVE,
        parentCommentId: null // Only top-level comments
      },
      include: {
        replies: {
          where: { status: CommentStatus.ACTIVE },
          include: {
            replies: {
              where: { status: CommentStatus.ACTIVE },
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Recent replies
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const enrichedComments = await Promise.all(
      comments.map(comment => this.enrichCommentWithAuthor(comment, currentUserId))
    )

    return {
      comments: enrichedComments,
      pagination: {
        page,
        limit,
        hasMore: comments.length === limit
      }
    }
  }

  // Tag Management
  async getTrendingTags(limit: number = 10): Promise<Array<{ tag: string; count: number }>> {
    const tags = await (prisma as any).postTag.findMany({
      orderBy: { postCount: 'desc' },
      take: limit
    })

    return tags.map(tag => ({ tag: tag.tag, count: tag.postCount }))
  }

  // Analytics
  async getCommunityAnalytics(fromDate?: Date, toDate?: Date): Promise<CommunityAnalytics> {
    const dateFilter = fromDate || toDate ? {} : undefined
    if (fromDate) dateFilter.gte = fromDate
    if (toDate) dateFilter.lte = toDate

    const [
      totalPosts,
      totalComments,
      totalLikes,
      totalShares,
      activeUsers,
      topTags
    ] = await Promise.all([
      (prisma as any).post.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
      (prisma as any).comment.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
      (prisma as any).post.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : {},
        _sum: { likedBy: { _count: true } }
      }),
      (prisma as any).post.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : {},
        _sum: { shareCount: true }
      }),
      (prisma as any).post.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        select: { authorId: true },
        distinct: ['authorId']
      }).then(posts => posts.length),
      (prisma as any).postTag.findMany({
        orderBy: { postCount: 'desc' },
        take: 10
      })
    ])

    const totalLikesCount = totalLikes._sum.likedBy?._count || 0
    const totalSharesCount = totalShares._sum.shareCount || 0

    const daysDiff = dateFilter ?
      Math.max(1, Math.ceil((toDate?.getTime() || Date.now()) - (fromDate?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)) :
      30 // Default to 30 days

    return {
      totalPosts,
      totalComments,
      totalLikes: totalLikesCount,
      totalShares: totalSharesCount,
      activeUsers,
      topTags: topTags.map(tag => ({ tag: tag.tag, count: tag.postCount })),
      engagementRate: totalPosts > 0 ? ((totalLikesCount + totalComments) / totalPosts) * 100 : 0,
      postsPerDay: totalPosts / daysDiff,
      commentsPerDay: totalComments / daysDiff
    }
  }

  // Moderation
  async moderatePost(postId: string, moderatorId: string, action: 'hide' | 'unhide' | 'delete'): Promise<any> {
    let status: PostStatus

    switch (action) {
      case 'hide':
        status = PostStatus.HIDDEN
        break
      case 'unhide':
        status = PostStatus.ACTIVE
        break
      case 'delete':
        status = PostStatus.DELETED
        break
    }

    return await (prisma as any).post.update({
      where: { id: postId },
      data: {
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date()
      }
    })
  }

  async moderateComment(commentId: string, moderatorId: string, action: 'hide' | 'unhide' | 'delete'): Promise<any> {
    let status: CommentStatus

    switch (action) {
      case 'hide':
        status = CommentStatus.HIDDEN
        break
      case 'unhide':
        status = CommentStatus.ACTIVE
        break
      case 'delete':
        status = CommentStatus.DELETED
        break
    }

    return await (prisma as any).comment.update({
      where: { id: commentId },
      data: {
        status,
        updatedAt: new Date()
      }
    })
  }

  // Helper Methods
  private async getPostWithAuthor(postId: string): Promise<any> {
    const post = await (prisma as any).post.findUnique({
      where: { id: postId }
    })

    if (!post) return null

    return this.enrichPostWithAuthor(post)
  }

  private async getCommentWithAuthor(commentId: string): Promise<any> {
    const comment = await (prisma as any).comment.findUnique({
      where: { id: commentId }
    })

    if (!comment) return null

    return this.enrichCommentWithAuthor(comment)
  }

  private async enrichPostWithAuthor(post: any, currentUserId?: string): Promise<any> {
    // Get author info
    const author = await (prisma as any).user.findUnique({
      where: { id: post.authorId },
      select: {
        id: true,
        email: true,
        profile: true
      }
    })

    const authorName = author?.profile?.firstName && author?.profile?.lastName
      ? `${author.profile.firstName} ${author.profile.lastName}`
      : `User ${author?.id.slice(-6)}`

    const authorAvatarUrl = author?.profile?.avatarUrl

    // Check if saved by current user
    let isSaved = false
    if (currentUserId) {
      const save = await (prisma as any).userSavedPost.findUnique({
        where: {
          userId_postId: {
            userId: currentUserId,
            postId: post.id
          }
        }
      })
      isSaved = !!save
    }

    return {
      ...post,
      authorName,
      authorAvatarUrl,
      isLiked: currentUserId ? post.likedBy.includes(currentUserId) : false,
      likeCount: post.likedBy.length,
      isSaved,
      isOwnPost: currentUserId === post.authorId
    }
  }

  private async enrichCommentWithAuthor(comment: any, currentUserId?: string): Promise<any> {
    // Get author info
    const author = await (prisma as any).user.findUnique({
      where: { id: comment.authorId },
      select: {
        id: true,
        profile: true
      }
    })

    const authorName = author?.profile?.firstName && author?.profile?.lastName
      ? `${author.profile.firstName} ${author.profile.lastName}`
      : `User ${author?.id.slice(-6)}`

    const authorAvatarUrl = author?.profile?.avatarUrl

    return {
      ...comment,
      authorName,
      authorAvatarUrl,
      isLiked: currentUserId ? comment.likedBy.includes(currentUserId) : false,
      likeCount: comment.likedBy.length,
      isOwnComment: currentUserId === comment.authorId
    }
  }

  private canViewPost(post: any, userId?: string): boolean {
    if (post.privacy === PostPrivacy.PUBLIC) return true
    if (post.privacy === PostPrivacy.PRIVATE) return post.authorId === userId
    // For followers privacy, would need follower relationship check
    return post.authorId === userId // Simplified
  }

  private async updateTagCounts(tags: string[], increment: number): Promise<void> {
    for (const tag of tags) {
      await (prisma as any).postTag.upsert({
        where: { tag },
        update: { postCount: { increment } },
        create: { tag, postCount: Math.max(0, increment) }
      })
    }
  }

  private async initializeTrendingTags(): Promise<void> {
    // Update trending tags every hour
    setInterval(async () => {
      try {
        // Get posts from last 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const recentPosts = await (prisma as any).post.findMany({
          where: {
            createdAt: { gte: yesterday },
            status: PostStatus.ACTIVE
          },
          select: { tags: true }
        })

        // Count tag occurrences
        const tagCounts: Record<string, number> = {}
        recentPosts.forEach(post => {
          post.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })
        })

        // Update database
        for (const [tag, count] of Object.entries(tagCounts)) {
          await (prisma as any).postTag.upsert({
            where: { tag },
            update: { postCount: count },
            create: { tag, postCount: count }
          })
        }

      } catch (error) {
        console.error('Error updating trending tags:', error)
      }
    }, 60 * 60 * 1000) // Every hour
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).post.count()
      return {
        status: 'healthy',
        service: 'community-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'community-service',
        error: (error as Error).message
      }
    }
  }
}
