import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { DisputeOpenedEvent, DisputeResolvedEvent } from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'

export enum ReviewStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REJECTED = 'rejected',
  HIDDEN = 'hidden'
}

export enum DisputeStatus {
  OPENED = 'opened',
  UNDER_REVIEW = 'under_review',
  EVIDENCE_COLLECTED = 'evidence_collected',
  DECIDED = 'decided',
  RESOLVED = 'resolved'
}

export enum DisputePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum DisputeDecision {
  REFUND = 'refund',
  REPLACEMENT = 'replacement',
  PARTIAL_REFUND = 'partial_refund',
  UPHOLD_SELLER = 'uphold_seller'
}

export interface CreateReviewRequest {
  orderId: string
  reviewerId: string
  productId: string
  sellerId: string
  title?: string
  content: string
  rating: number // 1-5
  isAnonymous?: boolean
}

export interface UpdateReviewRequest {
  title?: string
  content?: string
  rating?: number
}

export interface CreateDisputeRequest {
  orderId: string
  buyerId: string
  sellerId: string
  productId: string
  reason: string
  description: string
  evidence?: string[]
  priority?: DisputePriority
}

export interface DisputeResolutionRequest {
  decision: DisputeDecision
  decisionReason: string
  refundAmount?: number // in cents
}

export interface ReviewFilters {
  productId?: string
  sellerId?: string
  reviewerId?: string
  rating?: number
  status?: ReviewStatus
  isVerified?: boolean
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'
}

export interface TrustScoreCalculation {
  entityId: string
  entityType: 'product' | 'seller'
  rating: number
  totalReviews: number
  communicationScore?: number
  shippingScore?: number
  productQuality?: number
  accuracyScore?: number
  disputeRate?: number
  returnRate?: number
}

export class TrustService {
  constructor() {
    // Subscribe to events
    eventBus.subscribe('OrderDelivered.v1', {
      name: 'trust-service-order-delivered',
      handler: this.handleOrderDelivered.bind(this)
    })
  }

  // Review Management
  async createReview(request: CreateReviewRequest): Promise<any> {
    const {
      orderId,
      reviewerId,
      productId,
      sellerId,
      title,
      content,
      rating,
      isAnonymous = false
    } = request

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    // Check if review already exists for this order
    const existingReview = await (prisma as any).review.findUnique({
      where: { orderId }
    })

    if (existingReview) {
      throw new Error('Review already exists for this order')
    }

    // Check if order was delivered (for verified reviews)
    // This would typically come from order service
    const isVerified = true // Placeholder - should check order status

    const review = await (prisma as any).review.create({
      data: {
        orderId,
        reviewerId,
        productId,
        sellerId,
        title,
        content,
        rating,
        isVerified,
        isAnonymous,
        status: ReviewStatus.ACTIVE
      }
    })

    // Recalculate trust scores
    await this.recalculateTrustScore(productId, 'product')
    await this.recalculateTrustScore(sellerId, 'seller')

    return review
  }

  async getReviewById(reviewId: string): Promise<any> {
    return await (prisma as any).review.findUnique({
      where: { id: reviewId },
      include: {
        votes: true,
        reports: true
      }
    })
  }

  async updateReview(reviewId: string, reviewerId: string, updates: UpdateReviewRequest): Promise<any> {
    const review = await (prisma as any).review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      throw new Error('Review not found')
    }

    if (review.reviewerId !== reviewerId) {
      throw new Error('Unauthorized to update this review')
    }

    // Only allow updates within 30 days
    const daysSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation > 30) {
      throw new Error('Reviews can only be edited within 30 days')
    }

    const updatedReview = await (prisma as any).review.update({
      where: { id: reviewId },
      data: updates
    })

    // Recalculate trust scores if rating changed
    if (updates.rating && updates.rating !== review.rating) {
      await this.recalculateTrustScore(review.productId, 'product')
      await this.recalculateTrustScore(review.sellerId, 'seller')
    }

    return updatedReview
  }

  async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
    const review = await (prisma as any).review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      throw new Error('Review not found')
    }

    if (review.reviewerId !== reviewerId) {
      throw new Error('Unauthorized to delete this review')
    }

    await (prisma as any).review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.HIDDEN }
    })

    // Recalculate trust scores
    await this.recalculateTrustScore(review.productId, 'product')
    await this.recalculateTrustScore(review.sellerId, 'seller')
  }

  async voteOnReview(reviewId: string, userId: string, voteType: 'helpful' | 'not_helpful'): Promise<void> {
    // Check if user already voted
    const existingVote = await (prisma as any).reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId
        }
      }
    })

    if (existingVote) {
      // Update existing vote
      await (prisma as any).reviewVote.update({
        where: { id: existingVote.id },
        data: { voteType }
      })
    } else {
      // Create new vote
      await (prisma as any).reviewVote.create({
        data: {
          reviewId,
          userId,
          voteType
        }
      })
    }

    // Update review helpfulness counts
    await this.updateReviewHelpfulness(reviewId)
  }

  async reportReview(reviewId: string, reporterId: string, reason: string, description?: string): Promise<any> {
    return await (prisma as any).reviewReport.create({
      data: {
        reviewId,
        reporterId,
        reason,
        description
      }
    })
  }

  async moderateReview(reviewId: string, moderatorId: string, action: 'approve' | 'reject' | 'hide', reason?: string): Promise<any> {
    let status: ReviewStatus

    switch (action) {
      case 'approve':
        status = ReviewStatus.ACTIVE
        break
      case 'reject':
        status = ReviewStatus.REJECTED
        break
      case 'hide':
        status = ReviewStatus.HIDDEN
        break
    }

    return await (prisma as any).review.update({
      where: { id: reviewId },
      data: {
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationReason: reason
      }
    })
  }

  async respondToReview(reviewId: string, sellerId: string, response: string): Promise<any> {
    const review = await (prisma as any).review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      throw new Error('Review not found')
    }

    if (review.sellerId !== sellerId) {
      throw new Error('Unauthorized to respond to this review')
    }

    return await (prisma as any).review.update({
      where: { id: reviewId },
      data: {
        sellerResponse: response,
        sellerRespondedAt: new Date()
      }
    })
  }

  // Review Search and Filtering
  async searchReviews(filters: ReviewFilters, page: number = 1, limit: number = 20): Promise<any> {
    const where: any = {}

    if (filters.productId) where.productId = filters.productId
    if (filters.sellerId) where.sellerId = filters.sellerId
    if (filters.reviewerId) where.reviewerId = filters.reviewerId
    if (filters.rating) where.rating = filters.rating
    if (filters.status) where.status = filters.status
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified

    let orderBy: any = { createdAt: 'desc' }

    switch (filters.sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'rating_high':
        orderBy = { rating: 'desc' }
        break
      case 'rating_low':
        orderBy = { rating: 'asc' }
        break
      case 'helpful':
        orderBy = { helpful: 'desc' }
        break
    }

    const reviews = await (prisma as any).review.findMany({
      where,
      include: {
        votes: true,
        reports: {
          where: { status: 'pending' }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await (prisma as any).review.count({ where })

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // Dispute Resolution System
  async createDispute(request: CreateDisputeRequest): Promise<any> {
    const {
      orderId,
      buyerId,
      sellerId,
      productId,
      reason,
      description,
      evidence = [],
      priority = DisputePriority.NORMAL
    } = request

    // Check if dispute already exists for this order
    const existingDispute = await (prisma as any).dispute.findUnique({
      where: { orderId }
    })

    if (existingDispute) {
      throw new Error('Dispute already exists for this order')
    }

    // Calculate SLA deadline based on priority
    const slaHours = this.getSLABasedOnPriority(priority)
    const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000)

    const dispute = await (prisma as any).dispute.create({
      data: {
        orderId,
        buyerId,
        sellerId,
        productId,
        reason,
        description,
        evidence,
        priority,
        dueDate
      }
    })

    // Emit DisputeOpened event using helper function
    const envelope = eventBus.createEventEnvelope<DisputeOpenedEvent>('DisputeOpened', {
      disputeId: dispute.id,
      orderId,
      buyerId,
      sellerId,
      reason
    })

    eventBus.publish(envelope)

    // Check for SLA breach and auto-escalate if needed
    this.checkSLABreach(dispute.id)

    return dispute
  }

  async getDisputeById(disputeId: string): Promise<any> {
    return await (prisma as any).dispute.findUnique({
      where: { id: disputeId }
    })
  }

  async updateDisputeStatus(disputeId: string, status: DisputeStatus, adminId?: string): Promise<any> {
    const updateData: any = { status }

    if (status === DisputeStatus.RESOLVED) {
      updateData.resolvedAt = new Date()
    }

    if (adminId) {
      updateData.decidedBy = adminId
    }

    return await (prisma as any).dispute.update({
      where: { id: disputeId },
      data: updateData
    })
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolutionRequest
  ): Promise<any> {
    const dispute = await (prisma as any).dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        decision: resolution.decision,
        decisionReason: resolution.decisionReason,
        refundAmount: resolution.refundAmount,
        decidedBy: adminId,
        decidedAt: new Date(),
        resolvedAt: new Date()
      }
    })

    // Map decision to event format
    let eventResolution: 'refund' | 'uphold' | 'split'
    switch (resolution.decision) {
      case DisputeDecision.REFUND:
      case DisputeDecision.PARTIAL_REFUND:
        eventResolution = 'refund'
        break
      case DisputeDecision.UPHOLD_SELLER:
        eventResolution = 'uphold'
        break
      case DisputeDecision.REPLACEMENT:
        eventResolution = 'split'
        break
      default:
        eventResolution = 'uphold'
    }

    // Emit DisputeResolved event using helper function
    const envelope = eventBus.createEventEnvelope<DisputeResolvedEvent>('DisputeResolved', {
      disputeId,
      orderId: dispute.orderId,
      resolution: eventResolution,
      amount: resolution.refundAmount ? { amount: resolution.refundAmount, currency: 'TZS' } : undefined
    })

    eventBus.publish(envelope)

    return dispute
  }

  async escalateDispute(disputeId: string, reason: string): Promise<any> {
    return await (prisma as any).dispute.update({
      where: { id: disputeId },
      data: {
        priority: DisputePriority.URGENT,
        escalatedAt: new Date()
      }
    })
  }

  // Trust Score Management
  async recalculateTrustScore(entityId: string, entityType: 'product' | 'seller'): Promise<any> {
    // Get all reviews for this entity
    const reviews = await (prisma as any).review.findMany({
      where: {
        [entityType === 'product' ? 'productId' : 'sellerId']: entityId,
        status: ReviewStatus.ACTIVE
      }
    })

    if (reviews.length === 0) {
      return await (prisma as any).trustScore.upsert({
        where: {
          entityId_entityType: {
            entityId,
            entityType
          }
        },
        update: {
          score: 0,
          rating: 0,
          totalReviews: 0,
          lastCalculated: new Date()
        },
        create: {
          entityId,
          entityType,
          score: 0,
          rating: 0,
          totalReviews: 0
        }
      })
    }

    // Calculate average rating
    const averageRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length

    // Calculate trust score (simplified algorithm)
    let trustScore = averageRating * 20 // Base score from rating (0-100)

    // Additional factors based on entity type
    if (entityType === 'seller') {
      // Communication score, shipping score, etc. (would need more data)
      trustScore = Math.min(100, trustScore)
    } else {
      // Product quality, accuracy score, etc.
      trustScore = Math.min(100, trustScore)
    }

    return await (prisma as any).trustScore.upsert({
      where: {
        entityId_entityType: {
          entityId,
          entityType
        }
      },
      update: {
        score: trustScore,
        rating: averageRating,
        totalReviews: reviews.length,
        lastCalculated: new Date()
      },
      create: {
        entityId,
        entityType,
        score: trustScore,
        rating: averageRating,
        totalReviews: reviews.length
      }
    })
  }

  async getTrustScore(entityId: string, entityType: 'product' | 'seller'): Promise<any> {
    return await (prisma as any).trustScore.findUnique({
      where: {
        entityId_entityType: {
          entityId,
          entityType
        }
      }
    })
  }

  // Analytics and Reporting
  async getReviewAnalytics(filters?: {
    sellerId?: string
    productId?: string
    fromDate?: Date
    toDate?: Date
  }): Promise<any> {
    const where: any = {
      status: ReviewStatus.ACTIVE
    }

    if (filters?.sellerId) where.sellerId = filters.sellerId
    if (filters?.productId) where.productId = filters.productId
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalReviews,
      averageRating,
      ratingDistribution,
      verifiedReviews
    ] = await Promise.all([
      (prisma as any).review.count({ where }),
      (prisma as any).review.aggregate({
        where,
        _avg: { rating: true }
      }),
      (prisma as any).review.groupBy({
        by: ['rating'],
        where,
        _count: true
      }),
      (prisma as any).review.count({
        where: { ...where, isVerified: true }
      })
    ])

    return {
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      verifiedReviews,
      ratingDistribution: ratingDistribution.reduce((acc: any, dist: any) => {
        acc[dist.rating] = dist._count
        return acc
      }, {})
    }
  }

  async getDisputeAnalytics(filters?: {
    sellerId?: string
    status?: DisputeStatus
    fromDate?: Date
    toDate?: Date
  }): Promise<any> {
    const where: any = {}

    if (filters?.sellerId) where.sellerId = filters.sellerId
    if (filters?.status) where.status = filters.status
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalDisputes,
      disputesByStatus,
      disputesByReason,
      averageResolutionTime
    ] = await Promise.all([
      (prisma as any).dispute.count({ where }),
      (prisma as any).dispute.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      (prisma as any).dispute.groupBy({
        by: ['reason'],
        where,
        _count: true
      }),
      (prisma as any).dispute.aggregate({
        where: { resolvedAt: { not: null } },
        _avg: {
          resolvedAt: true,
          openedAt: true
        }
      })
    ])

    return {
      totalDisputes,
      disputesByStatus: disputesByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {}),
      disputesByReason: disputesByReason.reduce((acc: any, reason: any) => {
        acc[reason.reason] = reason._count
        return acc
      }, {}),
      averageResolutionTime: averageResolutionTime._avg.resolvedAt ?
        (new Date(averageResolutionTime._avg.resolvedAt).getTime() -
         new Date(averageResolutionTime._avg.openedAt).getTime()) / (1000 * 60 * 60) : null
    }
  }

  // Event Handlers
  async handleOrderDelivered(envelope: EventEnvelope): Promise<void> {
    // Could trigger review reminders, trust score updates, etc.
    console.log(`Order delivered for review system: ${envelope.payload.orderId}`)
  }

  // Helper Methods
  private async updateReviewHelpfulness(reviewId: string): Promise<void> {
    const votes = await (prisma as any).reviewVote.findMany({
      where: { reviewId }
    })

    const helpful = votes.filter((vote: any) => vote.voteType === 'helpful').length
    const notHelpful = votes.filter((vote: any) => vote.voteType === 'not_helpful').length

    await (prisma as any).review.update({
      where: { id: reviewId },
      data: {
        helpful,
        notHelpful
      }
    })
  }

  private getSLABasedOnPriority(priority: DisputePriority): number {
    switch (priority) {
      case DisputePriority.LOW:
        return 72 // 3 days
      case DisputePriority.NORMAL:
        return 48 // 2 days
      case DisputePriority.HIGH:
        return 24 // 1 day
      case DisputePriority.URGENT:
        return 12 // 12 hours
      default:
        return 48
    }
  }

  private async checkSLABreach(disputeId: string): Promise<void> {
    // This would run as a background job to check for SLA breaches
    // and auto-escalate disputes if needed
    setTimeout(async () => {
      const dispute = await (prisma as any).dispute.findUnique({
        where: { id: disputeId }
      })

      if (dispute && dispute.status !== DisputeStatus.RESOLVED && new Date() > dispute.dueDate) {
        // Auto-escalate
        await this.escalateDispute(disputeId, 'SLA breach - automatic escalation')
      }
    }, 60000) // Check in 1 minute (in production, this would be a proper job)
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).review.count()
      return {
        status: 'healthy',
        service: 'trust-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'trust-service',
        error: (error as Error).message
      }
    }
  }
}
