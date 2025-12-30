import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope, Money } from '../../../shared-contracts/types'
import {
  OrderPaidEvent,
  OrderDeliveredEvent,
  CommissionEarnedEvent
} from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'
import { PaymentService } from '../payment/payment'

export enum CommissionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum RewardStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum RewardType {
  LOYALTY = 'loyalty',
  REFERRAL = 'referral',
  PROMOTIONAL = 'promotional',
  CASHBACK = 'cashback'
}

export interface CommissionRates {
  sellerRate: number // e.g., 0.85 = 85% of order amount
  enablerRate?: number // e.g., 0.05 = 5% for delivery
  platformRate: number // e.g., 0.10 = 10% platform fee
}

export interface ReferralRequest {
  referrerId: string
  refereeEmail: string
  rewardType: 'discount' | 'cashback' | 'points'
  rewardValue: number
  expiresInDays?: number
}

export interface LoyaltyRewardRequest {
  userId: string
  orderAmount: number // in cents
  currency: string
}

export interface CommissionCalculationRequest {
  orderId: string
  sellerId: string
  enablerId?: string
  orderAmount: number // in cents
  currency: string
  rates: CommissionRates
}

export interface RewardRedemptionRequest {
  userId: string
  pointsToRedeem: number
  rewardType: 'cashback' | 'discount'
}

export class CommissionService {
  private paymentService: PaymentService
  private defaultRates: CommissionRates

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService

    // Default commission rates (configurable)
    this.defaultRates = {
      sellerRate: 0.85, // 85% to seller
      enablerRate: 0.05, // 5% to enabler
      platformRate: 0.10 // 10% platform fee
    }

    // Subscribe to events
    eventBus.subscribe('OrderPaid.v1', {
      name: 'commission-service-order-paid',
      handler: this.handleOrderPaid.bind(this)
    })
    eventBus.subscribe('OrderDelivered.v1', {
      name: 'commission-service-order-delivered',
      handler: this.handleOrderDelivered.bind(this)
    })
  }

  // Commission Calculation & Distribution
  async calculateCommission(request: CommissionCalculationRequest): Promise<any> {
    const { orderId, sellerId, enablerId, orderAmount, currency, rates } = request

    // Calculate amounts
    const sellerCommission = Math.round(orderAmount * rates.sellerRate)
    const enablerCommission = enablerId ? Math.round(orderAmount * (rates.enablerRate || 0)) : 0
    const platformFee = Math.round(orderAmount * rates.platformRate)

    // Verify total adds up
    const total = sellerCommission + enablerCommission + platformFee
    const difference = orderAmount - total

    // Adjust platform fee for rounding differences
    const adjustedPlatformFee = platformFee + difference

    // Create commission record
    const commission = await (prisma as any).commission.create({
      data: {
        orderId,
        sellerId,
        enablerId,
        productId: 'ORDER_COMMISSION', // Generic for now
        orderAmount,
        currency,
        sellerCommission,
        enablerCommission,
        platformFee: adjustedPlatformFee,
        sellerRate: rates.sellerRate,
        enablerRate: rates.enablerRate || 0,
        platformRate: rates.platformRate
      }
    })

    return commission
  }

  async processCommissionPayment(commissionId: string): Promise<any> {
    const commission = await (prisma as any).commission.findUnique({
      where: { id: commissionId }
    })

    if (!commission || commission.status !== CommissionStatus.PENDING) {
      throw new Error('Commission not found or already processed')
    }

    try {
      // Pay seller commission
      if (commission.sellerCommission > 0) {
        await this.paymentService.creditWallet({
          walletId: commission.sellerId,
          type: 'credit',
          amount: commission.sellerCommission,
          currency: commission.currency,
          description: `Commission for order ${commission.orderId}`,
          reference: commissionId
        })

        // Emit CommissionEarned event for seller using helper function
        const envelope = eventBus.createEventEnvelope<CommissionEarnedEvent>('CommissionEarned', {
          commissionId,
          orderId: commission.orderId,
          amount: { amount: commission.sellerCommission, currency: commission.currency },
          recipientId: commission.sellerId,
          recipientType: 'seller'
        })

        eventBus.publish(envelope)
      }

      // Pay enabler commission (if applicable)
      if (commission.enablerCommission && commission.enablerCommission > 0 && commission.enablerId) {
        await this.paymentService.creditWallet({
          walletId: commission.enablerId,
          type: 'credit',
          amount: commission.enablerCommission,
          currency: commission.currency,
          description: `Delivery commission for order ${commission.orderId}`,
          reference: commissionId
        })

        // Emit CommissionEarned event for enabler using helper function
        const envelope = eventBus.createEventEnvelope<CommissionEarnedEvent>('CommissionEarned', {
          commissionId,
          orderId: commission.orderId,
          amount: { amount: commission.enablerCommission, currency: commission.currency },
          recipientId: commission.enablerId,
          recipientType: 'enabler'
        })

        eventBus.publish(envelope)
      }

      // Update commission status
      await (prisma as any).commission.update({
        where: { id: commissionId },
        data: {
          status: CommissionStatus.PAID,
          paidAt: new Date()
        }
      })

      return commission

    } catch (error) {
      // Update status to failed
      await (prisma as any).commission.update({
        where: { id: commissionId },
        data: { status: CommissionStatus.FAILED }
      })
      throw error
    }
  }

  // Referral Program Management
  async createReferral(request: ReferralRequest): Promise<any> {
    const { referrerId, refereeEmail, rewardType, rewardValue, expiresInDays } = request

    // Generate unique referral code
    const code = this.generateReferralCode(referrerId)

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined

    const referral = await (prisma as any).referral.create({
      data: {
        referrerId,
        refereeId: refereeEmail, // Will be updated when user registers
        code,
        rewardType,
        rewardValue,
        expiresAt
      }
    })

    return referral
  }

  async applyReferralCode(email: string, code: string): Promise<any> {
    // Find referral by code
    const referral = await (prisma as any).referral.findUnique({
      where: { code }
    })

    if (!referral) {
      throw new Error('Invalid referral code')
    }

    if (referral.status !== ReferralStatus.PENDING) {
      throw new Error('Referral code already used')
    }

    if (referral.expiresAt && new Date() > referral.expiresAt) {
      await (prisma as any).referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.EXPIRED }
      })
      throw new Error('Referral code expired')
    }

    // Update referral with referee email
    await (prisma as any).referral.update({
      where: { id: referral.id },
      data: { refereeId: email }
    })

    return referral
  }

  async completeReferral(referralId: string, refereeUserId: string): Promise<any> {
    const referral = await (prisma as any).referral.findUnique({
      where: { id: referralId }
    })

    if (!referral || referral.status !== ReferralStatus.PENDING) {
      throw new Error('Referral not found or not pending')
    }

    // Update referral status
    const completedReferral = await (prisma as any).referral.update({
      where: { id: referralId },
      data: {
        refereeId: refereeUserId,
        status: ReferralStatus.COMPLETED,
        completedAt: new Date()
      }
    })

    // Grant reward to referrer
    await this.grantReferralReward(completedReferral)

    return completedReferral
  }

  private async grantReferralReward(referral: any): Promise<void> {
    const rewardDescription = `Referral reward for ${referral.rewardType}`

    if (referral.rewardType === 'points') {
      // Grant loyalty points
      await this.grantLoyaltyPoints(referral.referrerId, referral.rewardValue, rewardDescription)
    } else if (referral.rewardType === 'cashback') {
      // Credit wallet
      await this.paymentService.creditWallet({
        walletId: referral.referrerId,
        type: 'credit',
        amount: referral.rewardValue,
        currency: referral.currency,
        description: rewardDescription,
        reference: referral.id
      })
    }

    // Create reward record
    await (prisma as any).reward.create({
      data: {
        userId: referral.referrerId,
        type: RewardType.REFERRAL,
        description: rewardDescription,
        amount: referral.rewardType === 'cashback' ? referral.rewardValue : undefined,
        points: referral.rewardType === 'points' ? referral.rewardValue : undefined,
        currency: referral.currency,
        status: RewardStatus.ACTIVE
      }
    })
  }

  // Loyalty Program Management
  async createLoyaltyProgram(config: {
    name: string
    description?: string
    pointsPerTZS?: number
    minOrderAmount?: number
    pointsExpiryDays?: number
    pointsToTZS?: number
    minRedemptionPoints?: number
  }): Promise<any> {
    // Deactivate existing programs
    await (prisma as any).loyaltyProgram.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new program
    const program = await (prisma as any).loyaltyProgram.create({
      data: {
        name: config.name,
        description: config.description,
        pointsPerTZS: config.pointsPerTZS || 1.0,
        minOrderAmount: config.minOrderAmount || 0,
        pointsExpiryDays: config.pointsExpiryDays,
        pointsToTZS: config.pointsToTZS || 0.01,
        minRedemptionPoints: config.minRedemptionPoints || 100
      }
    })

    return program
  }

  async grantLoyaltyPoints(userId: string, orderAmount: number, orderId?: string): Promise<any> {
    // Get active loyalty program
    const program = await (prisma as any).loyaltyProgram.findFirst({
      where: { isActive: true }
    })

    if (!program || orderAmount < program.minOrderAmount) {
      return null // No points granted
    }

    // Calculate points
    const pointsEarned = Math.floor((orderAmount / 100) * program.pointsPerTZS) // Convert cents to currency units

    if (pointsEarned <= 0) {
      return null
    }

    // Calculate expiry
    const expiresAt = program.pointsExpiryDays
      ? new Date(Date.now() + program.pointsExpiryDays * 24 * 60 * 60 * 1000)
      : undefined

    // Create reward record
    const reward = await (prisma as any).reward.create({
      data: {
        userId,
        type: RewardType.LOYALTY,
        description: `Loyalty points for ${orderId ? `order ${orderId}` : 'purchase'}`,
        points: pointsEarned,
        currency: 'TZS',
        status: RewardStatus.ACTIVE,
        expiresAt
      }
    })

    return reward
  }

  async redeemLoyaltyPoints(request: RewardRedemptionRequest): Promise<any> {
    const { userId, pointsToRedeem, rewardType } = request

    // Get active loyalty program
    const program = await (prisma as any).loyaltyProgram.findFirst({
      where: { isActive: true }
    })

    if (!program) {
      throw new Error('No active loyalty program')
    }

    if (pointsToRedeem < program.minRedemptionPoints) {
      throw new Error(`Minimum redemption is ${program.minRedemptionPoints} points`)
    }

    // Calculate cash value
    const cashValue = Math.round(pointsToRedeem * program.pointsToTZS * 100) // Convert to cents

    // Get user's active rewards
    const userRewards = await (prisma as any).reward.findMany({
      where: {
        userId,
        type: RewardType.LOYALTY,
        status: RewardStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    // Calculate total available points
    const totalAvailablePoints = userRewards.reduce((sum: number, reward: any) =>
      sum + (reward.points || 0), 0)

    if (totalAvailablePoints < pointsToRedeem) {
      throw new Error('Insufficient loyalty points')
    }

    // Redeem points and mark rewards as redeemed
    let remainingPoints = pointsToRedeem

    for (const reward of userRewards) {
      if (remainingPoints <= 0) break

      const pointsToUse = Math.min(remainingPoints, reward.points || 0)

      if (pointsToUse === (reward.points || 0)) {
        // Use all points from this reward
        await (prisma as any).reward.update({
          where: { id: reward.id },
          data: { status: RewardStatus.REDEEMED, redeemedAt: new Date() }
        })
      } else {
        // Partial redemption - create new redeemed reward
        await (prisma as any).reward.update({
          where: { id: reward.id },
          data: { points: (reward.points || 0) - pointsToUse }
        })

        await (prisma as any).reward.create({
          data: {
            userId,
            type: RewardType.LOYALTY,
            description: `Redeemed ${pointsToUse} points`,
            points: pointsToUse,
            status: RewardStatus.REDEEMED,
            redeemedAt: new Date()
          }
        })
      }

      remainingPoints -= pointsToUse
    }

    // Grant cash reward
    if (rewardType === 'cashback') {
      await this.paymentService.creditWallet({
        walletId: userId,
        type: 'credit',
        amount: cashValue,
        currency: 'TZS',
        description: `Loyalty points redemption: ${pointsToRedeem} points`,
        reference: `LOYALTY_REDEMPTION_${Date.now()}`
      })
    }

    return {
      pointsRedeemed: pointsToRedeem,
      cashValue,
      rewardType
    }
  }

  // Event Handlers
  async handleOrderPaid(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as OrderPaidEvent

    try {
      // Calculate commission for this order
      // Note: In a real implementation, you'd get seller/enabler info from order data
      // For now, using placeholder logic

      const commission = await this.calculateCommission({
        orderId: event.orderId,
        sellerId: 'PLACEHOLDER_SELLER_ID', // Get from order
        enablerId: 'PLACEHOLDER_ENABLER_ID', // Get from shipment
        orderAmount: event.amount.amount,
        currency: event.amount.currency,
        rates: this.defaultRates
      })

      // Auto-process commission payment
      await this.processCommissionPayment(commission.id)

      // Grant loyalty points to buyer
      await this.grantLoyaltyPoints(event.buyerId, event.amount.amount, event.orderId)

    } catch (error) {
      console.error(`Failed to process commission for order ${event.orderId}:`, error)
    }
  }

  async handleOrderDelivered(envelope: EventEnvelope): Promise<void> {
    // Could trigger additional rewards or bonuses for successful deliveries
    console.log(`Order delivered: ${envelope.payload.orderId}`)
  }

  // Analytics & Reporting
  async getCommissionStats(filters?: {
    sellerId?: string
    enablerId?: string
    status?: CommissionStatus
    fromDate?: Date
    toDate?: Date
  }): Promise<any> {
    const where: any = {}

    if (filters?.sellerId) where.sellerId = filters.sellerId
    if (filters?.enablerId) where.enablerId = filters.enablerId
    if (filters?.status) where.status = filters.status
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalCommissions,
      totalPaid,
      commissionsByStatus
    ] = await Promise.all([
      (prisma as any).commission.count({ where }),
      (prisma as any).commission.aggregate({
        where,
        _sum: {
          sellerCommission: true,
          enablerCommission: true,
          platformFee: true
        }
      }),
      (prisma as any).commission.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ])

    return {
      totalCommissions,
      totalPaid: {
        sellerCommission: totalPaid._sum.sellerCommission || 0,
        enablerCommission: totalPaid._sum.enablerCommission || 0,
        platformFee: totalPaid._sum.platformFee || 0
      },
      commissionsByStatus: commissionsByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {})
    }
  }

  async getReferralStats(filters?: {
    referrerId?: string
    status?: ReferralStatus
    fromDate?: Date
    toDate?: Date
  }): Promise<any> {
    const where: any = {}

    if (filters?.referrerId) where.referrerId = filters.referrerId
    if (filters?.status) where.status = filters.status
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalReferrals,
      referralsByStatus
    ] = await Promise.all([
      (prisma as any).referral.count({ where }),
      (prisma as any).referral.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ])

    return {
      totalReferrals,
      referralsByStatus: referralsByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {})
    }
  }

  // Utility Methods
  private generateReferralCode(referrerId: string): string {
    const timestamp = Date.now().toString().slice(-4)
    const random = Math.random().toString(36).substring(2, 4).toUpperCase()
    return `REF${referrerId.slice(-4).toUpperCase()}${timestamp}${random}`
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).commission.count()
      return {
        status: 'healthy',
        service: 'commission-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'commission-service',
        error: (error as Error).message
      }
    }
  }
}
