import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { SellerVerifiedEvent, UserSuspendedEvent, UserRegisteredEvent } from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'

export enum SellerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

export enum KYCStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum DocumentType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  BUSINESS_LICENSE = 'business_license',
  TAX_CERTIFICATE = 'tax_certificate',
  PROOF_OF_ADDRESS = 'proof_of_address',
  BANK_STATEMENT = 'bank_statement'
}

export enum BadgeType {
  VERIFIED = 'verified',
  TOP_SELLER = 'top_seller',
  FAST_SHIPPER = 'fast_shipper',
  HIGH_RATED = 'high_rated',
  PREMIUM = 'premium',
  TRUSTED = 'trusted'
}

export interface SellerRegistrationRequest {
  userId: string
  businessName: string
  businessType: string
  taxId?: string
  phone: string
  website?: string
  address: {
    street: string
    city: string
    region: string
    postalCode?: string
    country: string
  }
  description?: string
}

export interface KYCDocumentUpload {
  sellerId: string
  documentType: DocumentType
  documentNumber?: string
  documentUrl: string
  expiryDate?: Date
}

export interface SellerUpdateRequest {
  businessName?: string
  businessType?: string
  taxId?: string
  phone?: string
  website?: string
  address?: any
  description?: string
  logoUrl?: string
  bannerUrl?: string
  preferences?: any
}

export interface SellerAnalytics {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  activeProducts: number
  lowStockProducts: number
  pendingOrders: number
  completedOrders: number
  returnRate: number
}

export class SellerService {
  constructor() {
    // Subscribe to UserRegistered event to handle seller-specific user registration
    eventBus.subscribe('UserRegistered.v1', {
      name: 'seller-service-user-handler',
      handler: this.handleUserRegistered.bind(this)
    })

    // Subscribe to SellerVerified event - published by this service, consumed by Catalog, Trust, Notification
    // The SellerVerified event is published by this service and consumed by others
  }

  // Seller Registration & Onboarding
  async registerSeller(request: SellerRegistrationRequest): Promise<any> {
    // Check if user already has a seller profile
    const existingSeller = await (prisma as any).seller.findUnique({
      where: { userId: request.userId }
    })

    if (existingSeller) {
      throw new Error('Seller profile already exists for this user')
    }

    // Create seller profile
    const seller = await (prisma as any).seller.create({
      data: {
        userId: request.userId,
        businessName: request.businessName,
        businessType: request.businessType,
        taxId: request.taxId,
        phone: request.phone,
        website: request.website,
        address: request.address,
        description: request.description,
        preferences: {
          notifications: true,
          language: 'en',
          timezone: 'Africa/Dar_es_Salaam',
          currency: 'TZS'
        }
      },
      include: {
        user: {
          select: { email: true, role: true }
        }
      }
    })

    // Update user role to seller if not already
    await (prisma as any).user.update({
      where: { id: request.userId },
      data: { role: 'seller' }
    })

    return seller
  }

  async getSellerById(sellerId: string): Promise<any> {
    return await (prisma as any).seller.findUnique({
      where: { id: sellerId },
      include: {
        user: {
          select: { email: true, isActive: true }
        },
        badges: {
          where: { isActive: true }
        },
        kycDocuments: true
      }
    })
  }

  async getSellerByUserId(userId: string): Promise<any> {
    return await (prisma as any).seller.findUnique({
      where: { userId },
      include: {
        user: {
          select: { email: true, isActive: true }
        },
        badges: {
          where: { isActive: true }
        },
        kycDocuments: true
      }
    })
  }

  async updateSeller(sellerId: string, updates: SellerUpdateRequest): Promise<any> {
    const seller = await (prisma as any).seller.update({
      where: { id: sellerId },
      data: updates,
      include: {
        user: {
          select: { email: true }
        }
      }
    })

    return seller
  }

  // KYC Verification Process
  async submitKYCDocument(upload: KYCDocumentUpload): Promise<any> {
    const document = await (prisma as any).kYCDocument.create({
      data: {
        sellerId: upload.sellerId,
        documentType: upload.documentType,
        documentNumber: upload.documentNumber,
        documentUrl: upload.documentUrl,
        expiryDate: upload.expiryDate,
        status: 'submitted'
      }
    })

    // Update seller KYC status if first document
    const seller = await (prisma as any).seller.findUnique({
      where: { id: upload.sellerId },
      select: { kycStatus: true }
    })

    if (seller?.kycStatus === 'pending') {
      await (prisma as any).seller.update({
        where: { id: upload.sellerId },
        data: { kycStatus: 'submitted' }
      })
    }

    return document
  }

  async getKYCDocuments(sellerId: string): Promise<any[]> {
    return await (prisma as any).kYCDocument.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' }
    })
  }

  async reviewKYCDocument(documentId: string, status: 'approved' | 'rejected', adminId: string, rejectionReason?: string): Promise<any> {
    const document = await (prisma as any).kYCDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason,
        verifiedBy: adminId,
        verifiedAt: new Date()
      }
    })

    // Check if all required documents are approved
    await this.checkKYCCompletion(document.sellerId)

    return document
  }

  private async checkKYCCompletion(sellerId: string): Promise<void> {
    const documents = await (prisma as any).kYCDocument.findMany({
      where: { sellerId }
    })

    const requiredTypes = ['national_id', 'business_license', 'tax_certificate']
    const approvedDocuments = documents.filter((doc: any) => doc.status === 'approved')
    const approvedTypes = approvedDocuments.map((doc: any) => doc.documentType)

    const allRequiredApproved = requiredTypes.every(type => approvedTypes.includes(type))
    const anyRejected = documents.some((doc: any) => doc.status === 'rejected')

    let newStatus: KYCStatus
    if (anyRejected) {
      newStatus = KYCStatus.REJECTED
    } else if (allRequiredApproved) {
      newStatus = KYCStatus.VERIFIED
    } else {
      newStatus = KYCStatus.UNDER_REVIEW
    }

    await (prisma as any).seller.update({
      where: { id: sellerId },
      data: {
        kycStatus: newStatus,
        verificationDate: newStatus === KYCStatus.VERIFIED ? new Date() : undefined
      }
    })

    // Emit SellerVerified event if verified
    if (newStatus === KYCStatus.VERIFIED) {
      await this.emitSellerVerifiedEvent(sellerId)
    }
  }

  // Seller Verification & Activation
  async verifySeller(sellerId: string, adminId: string): Promise<any> {
    const seller = await (prisma as any).seller.update({
      where: { id: sellerId },
      data: {
        status: SellerStatus.ACTIVE,
        isActive: true,
        kycStatus: KYCStatus.VERIFIED,
        verificationDate: new Date(),
        verifiedBy: adminId
      }
    })

    // Award verified badge
    await this.awardBadge(sellerId, BadgeType.VERIFIED, 'Verified Seller', 'Seller identity and business documents verified')

    // Emit SellerVerified event
    await this.emitSellerVerifiedEvent(sellerId)

    return seller
  }

  async suspendSeller(sellerId: string, adminId: string, reason: string): Promise<any> {
    const seller = await (prisma as any).seller.update({
      where: { id: sellerId },
      data: {
        status: SellerStatus.SUSPENDED,
        isActive: false,
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: adminId
      }
    })

    // Emit UserSuspended event using helper function
    const envelope = eventBus.createEventEnvelope<UserSuspendedEvent>('UserSuspended', {
      userId: seller.userId,
      reason: `Seller account suspended: ${reason}`
    })

    eventBus.publish(envelope)

    return seller
  }

  async reactivateSeller(sellerId: string, adminId: string): Promise<any> {
    return await (prisma as any).seller.update({
      where: { id: sellerId },
      data: {
        status: SellerStatus.ACTIVE,
        isActive: true,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null
      }
    })
  }

  // Badge & Reputation System
  async awardBadge(sellerId: string, badgeType: BadgeType, badgeName: string, description?: string, iconUrl?: string): Promise<any> {
    // Check if badge already exists
    const existingBadge = await (prisma as any).sellerBadge.findFirst({
      where: {
        sellerId,
        badgeType,
        isActive: true
      }
    })

    if (existingBadge) {
      return existingBadge // Badge already awarded
    }

    return await (prisma as any).sellerBadge.create({
      data: {
        sellerId,
        badgeType,
        badgeName,
        description,
        iconUrl
      }
    })
  }

  async revokeBadge(badgeId: string): Promise<any> {
    return await (prisma as any).sellerBadge.update({
      where: { id: badgeId },
      data: { isActive: false }
    })
  }

  async checkAndAwardBadges(sellerId: string): Promise<void> {
    const seller = await (prisma as any).seller.findUnique({
      where: { id: sellerId },
      select: {
        totalSales: true,
        rating: true,
        totalRevenue: true
      }
    })

    if (!seller) return

    // Top Seller Badge (high revenue)
    if (seller.totalRevenue > 10000000) { // 100,000 TZS
      await this.awardBadge(sellerId, BadgeType.TOP_SELLER, 'Top Seller', 'High revenue seller')
    }

    // High Rated Badge
    if (seller.rating >= 4.5 && seller.totalReviews >= 10) {
      await this.awardBadge(sellerId, BadgeType.HIGH_RATED, 'Highly Rated', 'Excellent customer ratings')
    }

    // Trusted Badge (many successful sales)
    if (seller.totalSales > 100) {
      await this.awardBadge(sellerId, BadgeType.TRUSTED, 'Trusted Seller', 'Proven track record of successful sales')
    }
  }

  // Performance Analytics
  async getSellerAnalytics(sellerId: string, dateRange?: { from: Date; to: Date }): Promise<SellerAnalytics> {
    const where: any = { sellerId }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      }
    }

    // Get product counts
    const totalProducts = await (prisma as any).product.count({ where: { sellerId } })
    const activeProducts = await (prisma as any).product.count({
      where: { sellerId, isActive: true, status: 'published' }
    })

    // Get low stock products (this would need integration with inventory service)
    const lowStockProducts = 0 // Placeholder

    // Get order statistics (this would need integration with order service)
    const totalOrders = 0 // Placeholder
    const pendingOrders = 0 // Placeholder
    const completedOrders = 0 // Placeholder
    const totalRevenue = 0 // Placeholder
    const returnRate = 0 // Placeholder

    // Get rating data
    const seller = await (prisma as any).seller.findUnique({
      where: { id: sellerId },
      select: { rating: true, totalReviews: true }
    })

    return {
      totalProducts,
      totalOrders,
      totalRevenue,
      averageRating: seller?.rating || 0,
      totalReviews: seller?.totalReviews || 0,
      activeProducts,
      lowStockProducts,
      pendingOrders,
      completedOrders,
      returnRate
    }
  }

  // Bulk Operations
  async bulkUpdateSellerStatus(sellerIds: string[], status: SellerStatus, reason?: string, adminId?: string): Promise<any[]> {
    const results = []

    for (const sellerId of sellerIds) {
      try {
        let updateData: any = { status }

        if (status === SellerStatus.SUSPENDED) {
          updateData.isActive = false
          updateData.suspensionReason = reason
          updateData.suspendedAt = new Date()
          updateData.suspendedBy = adminId
        } else if (status === SellerStatus.ACTIVE) {
          updateData.isActive = true
          updateData.suspensionReason = null
          updateData.suspendedAt = null
          updateData.suspendedBy = null
        }

        const seller = await (prisma as any).seller.update({
          where: { id: sellerId },
          data: updateData
        })

        results.push({ sellerId, success: true, seller })
      } catch (error) {
        results.push({ sellerId, success: false, error: (error as Error).message })
      }
    }

    return results
  }

  // Seller Search & Filtering
  async searchSellers(filters?: {
    status?: SellerStatus
    kycStatus?: KYCStatus
    businessType?: string
    search?: string
    verifiedOnly?: boolean
  }, page: number = 1, limit: number = 20): Promise<any> {
    const where: any = {}

    if (filters?.status) where.status = filters.status
    if (filters?.kycStatus) where.kycStatus = filters.kycStatus
    if (filters?.businessType) where.businessType = filters.businessType
    if (filters?.verifiedOnly) where.kycStatus = KYCStatus.VERIFIED
    if (filters?.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const sellers = await (prisma as any).seller.findMany({
      where,
      include: {
        user: {
          select: { email: true }
        },
        badges: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await (prisma as any).seller.count({ where })

    return {
      sellers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  // Event Emission Helpers
  private async emitSellerVerifiedEvent(sellerId: string): Promise<void> {
    const seller = await (prisma as any).seller.findUnique({
      where: { id: sellerId },
      select: { userId: true, businessName: true }
    })

    if (!seller) return

    // Emit SellerVerified event using helper function
    const envelope = eventBus.createEventEnvelope<SellerVerifiedEvent>('SellerVerified', {
      sellerId,
      kycStatus: 'verified'
    })

    eventBus.publish(envelope)
  }

  // Utility Methods
  async updateSellerRating(sellerId: string, newRating: number, totalReviews: number): Promise<any> {
    // Calculate new average rating
    const seller = await (prisma as any).seller.findUnique({
      where: { id: sellerId },
      select: { rating: true, totalReviews: true }
    })

    if (!seller) throw new Error('Seller not found')

    const currentTotalRating = seller.rating * seller.totalReviews
    const newTotalRating = currentTotalRating + newRating
    const newAverageRating = newTotalRating / totalReviews

    return await (prisma as any).seller.update({
      where: { id: sellerId },
      data: {
        rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
        totalReviews
      }
    })
  }

  async updateSellerStats(sellerId: string, stats: {
    totalSales?: number
    totalRevenue?: number
  }): Promise<any> {
    return await (prisma as any).seller.update({
      where: { id: sellerId },
      data: stats
    })
  }

  // Event Handlers
  async handleUserRegistered(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as UserRegisteredEvent

    try {
      // When a user registers, check if they are a seller and initialize seller-specific data
      if (event.role === 'seller') {
        // Check if seller profile already exists
        const existingSeller = await (prisma as any).seller.findUnique({
          where: { userId: event.userId }
        })

        if (!existingSeller) {
          // Create basic seller profile placeholder
          // In a real implementation, this might send a welcome email or setup onboarding
          console.log(`New seller registered: ${event.userId}, email: ${event.email}`)
        }
      }
    } catch (error) {
      console.error(`Failed to handle UserRegistered for user ${event.userId}:`, error)
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).seller.count()
      return {
        status: 'healthy',
        service: 'seller-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'seller-service',
        error: (error as Error).message
      }
    }
  }
}
