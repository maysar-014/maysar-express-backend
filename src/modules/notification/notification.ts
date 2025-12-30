import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { eventBus } from '../../events/eventBus'

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PAYMENT_UPDATE = 'payment_update',
  REVIEW_UPDATE = 'review_update',
  MARKETING = 'marketing',
  SYSTEM = 'system',
  SECURITY = 'security'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum DeliveryStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export interface NotificationTemplate {
  name: string
  type: NotificationType
  channel: NotificationChannel
  subject?: string
  body: string
  variables: Record<string, any>
  language?: string
  description?: string
}

export interface NotificationRequest {
  userId: string
  type: NotificationType
  channel: NotificationChannel
  templateName?: string
  subject?: string
  body?: string
  variables?: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  scheduledAt?: Date
}

export interface BulkNotificationRequest {
  userIds: string[]
  templateName: string
  variables?: Record<string, any>
  channels?: NotificationChannel[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  scheduledAt?: Date
}

export interface UserNotificationPreferences {
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  inAppEnabled?: boolean
  orderUpdates?: boolean
  paymentUpdates?: boolean
  reviewUpdates?: boolean
  marketingEmails?: boolean
  systemAlerts?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

export interface NotificationAnalytics {
  totalSent: number
  totalDelivered: number
  deliveryRate: number
  averageDeliveryTime: number
  failuresByChannel: Record<string, number>
  popularTemplates: Array<{ template: string; count: number }>
}

export class NotificationService {
  private emailProvider: EmailProvider
  private smsProvider: SMSProvider
  private pushProvider: PushProvider
  private queue: NotificationQueue

  constructor() {
    // Initialize providers (would use real services in production)
    this.emailProvider = new EmailProvider()
    this.smsProvider = new SMSProvider()
    this.pushProvider = new PushProvider()
    this.queue = new NotificationQueue(this)

    // Subscribe to events
    this.setupEventListeners()

    // Start queue processor
    this.queue.startProcessing()
  }

  // Template Management
  async createTemplate(template: NotificationTemplate): Promise<any> {
    const existingTemplate = await (prisma as any).notificationTemplate.findUnique({
      where: { name: template.name }
    })

    if (existingTemplate) {
      throw new Error('Template with this name already exists')
    }

    return await (prisma as any).notificationTemplate.create({
      data: {
        name: template.name,
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        language: template.language || 'en',
        description: template.description
      }
    })
  }

  async getTemplate(name: string): Promise<any> {
    return await (prisma as any).notificationTemplate.findUnique({
      where: { name }
    })
  }

  async updateTemplate(name: string, updates: Partial<NotificationTemplate>): Promise<any> {
    return await (prisma as any).notificationTemplate.update({
      where: { name },
      data: updates
    })
  }

  async deleteTemplate(name: string): Promise<void> {
    await (prisma as any).notificationTemplate.delete({
      where: { name }
    })
  }

  async listTemplates(filters?: {
    type?: NotificationType
    channel?: NotificationChannel
    language?: string
    activeOnly?: boolean
  }): Promise<any[]> {
    const where: any = {}

    if (filters?.type) where.type = filters.type
    if (filters?.channel) where.channel = filters.channel
    if (filters?.language) where.language = filters.language
    if (filters?.activeOnly !== false) where.isActive = true

    return await (prisma as any).notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' }
    })
  }

  // Notification Sending
  async sendNotification(request: NotificationRequest): Promise<any> {
    const { userId, type, channel, templateName, variables = {}, priority = 'normal' } = request

    // Check user preferences
    const preferences = await this.getUserPreferences(userId)
    if (!this.isChannelEnabled(channel, preferences)) {
      throw new Error(`User has disabled ${channel} notifications`)
    }

    if (!this.isTypeEnabled(type, preferences)) {
      throw new Error(`User has disabled ${type} notifications`)
    }

    // Check quiet hours
    if (this.isQuietHour(preferences)) {
      // Schedule for later if urgent, otherwise skip
      if (priority !== 'urgent') {
        return { status: 'skipped', reason: 'quiet_hours' }
      }
    }

    // Get user contact info
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { email: true, profile: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    let subject: string | undefined
    let body: string

    // Use template if specified
    if (templateName) {
      const template = await this.getTemplate(templateName)
      if (!template) {
        throw new Error('Template not found')
      }

      subject = request.subject || template.subject
      body = this.renderTemplate(template.body, variables)
    } else {
      if (!request.body) {
        throw new Error('Body is required when not using a template')
      }
      subject = request.subject
      body = request.body
    }

    // Create notification record
    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        templateId: templateName,
        type,
        channel,
        subject,
        body,
        variables,
        priority,
        scheduledAt: request.scheduledAt,
        recipientEmail: channel === NotificationChannel.EMAIL ? user.email : undefined,
        recipientPhone: channel === NotificationChannel.SMS ? (user.profile as any)?.phone : undefined
      }
    })

    // Send immediately or queue
    if (request.scheduledAt && request.scheduledAt > new Date()) {
      // Scheduled for later
      return notification
    } else {
      // Send immediately
      await this.queue.addToQueue(notification)
      return notification
    }
  }

  async sendBulkNotification(request: BulkNotificationRequest): Promise<any> {
    const { userIds, templateName, variables = {}, channels = [NotificationChannel.EMAIL], priority = 'normal' } = request

    const template = await this.getTemplate(templateName)
    if (!template) {
      throw new Error('Template not found')
    }

    const notifications = []

    for (const userId of userIds) {
      for (const channel of channels) {
        try {
          const notification = await this.sendNotification({
            userId,
            type: template.type,
            channel,
            templateName,
            variables,
            priority,
            scheduledAt: request.scheduledAt
          })

          notifications.push(notification)
        } catch (error) {
          // Log error but continue with other users
          console.error(`Failed to queue notification for user ${userId}:`, error)
        }
      }
    }

    return {
      totalQueued: notifications.length,
      notifications
    }
  }

  // User Preferences Management
  async getUserPreferences(userId: string): Promise<any> {
    let preferences = await (prisma as any).userNotificationPreference.findUnique({
      where: { userId }
    })

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await (prisma as any).userNotificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          inAppEnabled: true,
          orderUpdates: true,
          paymentUpdates: true,
          reviewUpdates: true,
          marketingEmails: false,
          systemAlerts: true,
          timezone: 'Africa/Dar_es_Salaam'
        }
      })
    }

    return preferences
  }

  async updateUserPreferences(userId: string, preferences: UserNotificationPreferences): Promise<any> {
    return await (prisma as any).userNotificationPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences
      }
    })
  }

  // Notification History & Status
  async getUserNotifications(userId: string, filters?: {
    type?: NotificationType
    channel?: NotificationChannel
    status?: NotificationStatus
    limit?: number
    offset?: number
  }): Promise<any> {
    const where: any = { userId }

    if (filters?.type) where.type = filters.type
    if (filters?.channel) where.channel = filters.channel
    if (filters?.status) where.status = filters.status

    const notifications = await (prisma as any).notification.findMany({
      where,
      include: {
        template: true,
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    })

    const total = await (prisma as any).notification.count({ where })

    return {
      notifications,
      pagination: {
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0
      }
    }
  }

  async getNotificationStatus(notificationId: string): Promise<any> {
    return await (prisma as any).notification.findUnique({
      where: { id: notificationId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  // Campaign Management
  async createCampaign(campaign: {
    name: string
    description?: string
    templateId: string
    targetUsers: string[]
    variables?: Record<string, any>
    scheduledAt?: Date
    createdBy: string
  }): Promise<any> {
    const template = await (prisma as any).notificationTemplate.findUnique({
      where: { name: campaign.templateId }
    })

    if (!template) {
      throw new Error('Template not found')
    }

    return await (prisma as any).notificationCampaign.create({
      data: {
        name: campaign.name,
        description: campaign.description,
        templateId: campaign.templateId,
        targetUsers: campaign.targetUsers,
        variables: campaign.variables,
        scheduledAt: campaign.scheduledAt,
        totalRecipients: campaign.targetUsers.length,
        createdBy: campaign.createdBy
      }
    })
  }

  async executeCampaign(campaignId: string): Promise<any> {
    const campaign = await (prisma as any).notificationCampaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign already executed')
    }

    // Update status
    await (prisma as any).notificationCampaign.update({
      where: { id: campaignId },
      data: { status: 'running' }
    })

    // Send to all target users
    const result = await this.sendBulkNotification({
      userIds: campaign.targetUsers,
      templateName: campaign.templateId,
      variables: campaign.variables as any,
      scheduledAt: campaign.scheduledAt || undefined
    })

    // Update campaign metrics
    await (prisma as any).notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        sentCount: result.totalQueued
      }
    })

    return result
  }

  // Analytics & Reporting
  async getNotificationAnalytics(filters?: {
    fromDate?: Date
    toDate?: Date
    channel?: NotificationChannel
    type?: NotificationType
  }): Promise<NotificationAnalytics> {
    const where: any = {}

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    // Get delivery stats
    const [totalStats, channelFailures, templateUsage] = await Promise.all([
      (prisma as any).notification.aggregate({
        where,
        _count: { id: true }
      }),
      (prisma as any).deliveryLog.groupBy({
        by: ['status'],
        where: { ...where, status: 'failed' },
        _count: true
      }),
      (prisma as any).notification.groupBy({
        by: ['templateId'],
        where,
        _count: { id: true }
      })
    ])

    const totalSent = totalStats._count.id

    // Calculate delivery metrics (simplified)
    const deliveredCount = Math.floor(totalSent * 0.85) // Assuming 85% delivery rate
    const deliveryRate = (deliveredCount / totalSent) * 100
    const averageDeliveryTime = 300 // seconds

    const failuresByChannel = channelFailures.reduce((acc: any, stat: any) => {
      acc[stat.status] = stat._count
      return acc
    }, {})

    const popularTemplates = templateUsage
      .filter((t: any) => t.templateId)
      .map((t: any) => ({ template: t.templateId, count: t._count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)

    return {
      totalSent,
      totalDelivered: deliveredCount,
      deliveryRate,
      averageDeliveryTime,
      failuresByChannel,
      popularTemplates
    }
  }

  // Provider Integrations
  private async sendViaChannel(notification: any): Promise<void> {
    const { id, channel, recipientEmail, recipientPhone, subject, body } = notification

    try {
      let result: any

      switch (channel) {
        case NotificationChannel.EMAIL:
          result = await this.emailProvider.send({
            to: recipientEmail,
            subject,
            body
          })
          break

        case NotificationChannel.SMS:
          result = await this.smsProvider.send({
            to: recipientPhone,
            message: body
          })
          break

        case NotificationChannel.PUSH:
          result = await this.pushProvider.send({
            userId: notification.userId,
            title: subject,
            body
          })
          break

        case NotificationChannel.IN_APP:
          // In-app notifications are stored and delivered via API
          result = { success: true, providerId: 'in_app_' + id }
          break

        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }

      // Log successful delivery
      await this.logDelivery(id, 1, DeliveryStatus.SENT, channel + '_provider', result.providerId, result)

      // Update notification status
      await (prisma as any).notification.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date()
        }
      })

    } catch (error: any) {
      // Log delivery failure
      await this.logDelivery(id, 1, DeliveryStatus.FAILED, channel + '_provider', undefined, undefined, error.message)

      // Handle retry logic
      await this.handleDeliveryFailure(notification, error)
    }
  }

  private async logDelivery(
    notificationId: string,
    attempt: number,
    status: DeliveryStatus,
    provider?: string,
    providerId?: string,
    response?: any,
    errorMessage?: string
  ): Promise<void> {
    await (prisma as any).deliveryLog.create({
      data: {
        notificationId,
        attempt,
        status,
        provider,
        providerId,
        response,
        errorMessage,
        deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : undefined
      }
    })
  }

  private async handleDeliveryFailure(notification: any, error: any): Promise<void> {
    const { id, retryCount, maxRetries } = notification

    if (retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const delayMinutes = Math.pow(2, retryCount) // 1, 2, 4, 8 minutes
      const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000)

      await (prisma as any).notification.update({
        where: { id },
        data: {
          retryCount: retryCount + 1,
          nextRetryAt,
          errorMessage: error.message
        }
      })

      // Re-queue for retry
      setTimeout(() => {
        this.queue.addToQueue(notification)
      }, delayMinutes * 60 * 1000)

    } else {
      // Max retries reached, mark as failed
      await (prisma as any).notification.update({
        where: { id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: error.message
        }
      })
    }
  }

  // Template Rendering
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template

    // Replace {{variable}} with actual values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      rendered = rendered.replace(regex, String(value))
    }

    return rendered
  }

  // Preference Checks
  private isChannelEnabled(channel: NotificationChannel, preferences: any): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled !== false
      case NotificationChannel.SMS:
        return preferences.smsEnabled !== false
      case NotificationChannel.PUSH:
        return preferences.pushEnabled !== false
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled !== false
      default:
        return false
    }
  }

  private isTypeEnabled(type: NotificationType, preferences: any): boolean {
    switch (type) {
      case NotificationType.ORDER_UPDATE:
        return preferences.orderUpdates !== false
      case NotificationType.PAYMENT_UPDATE:
        return preferences.paymentUpdates !== false
      case NotificationType.REVIEW_UPDATE:
        return preferences.reviewUpdates !== false
      case NotificationType.MARKETING:
        return preferences.marketingEmails === true
      case NotificationType.SYSTEM:
      case NotificationType.SECURITY:
        return preferences.systemAlerts !== false
      default:
        return true
    }
  }

  private isQuietHour(preferences: any): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone: preferences.timezone || 'Africa/Dar_es_Salaam',
      hour12: false
    }).slice(0, 5) // HH:MM format

    const start = preferences.quietHoursStart
    const end = preferences.quietHoursEnd

    if (start < end) {
      // Same day range
      return currentTime >= start && currentTime <= end
    } else {
      // Overnight range
      return currentTime >= start || currentTime <= end
    }
  }

  // Event Listeners Setup
  private setupEventListeners(): void {
    // Order events
    eventBus.subscribe('OrderCreated.v1', async (envelope) => {
      const { buyerId, sellerId, totalAmount } = envelope.payload
      await this.sendNotification({
        userId: buyerId,
        type: NotificationType.ORDER_UPDATE,
        channel: NotificationChannel.EMAIL,
        templateName: 'order_created_buyer',
        variables: {
          orderId: envelope.payload.orderId,
          amount: totalAmount.amount,
          currency: totalAmount.currency
        }
      })

      await this.sendNotification({
        userId: sellerId,
        type: NotificationType.ORDER_UPDATE,
        channel: NotificationChannel.EMAIL,
        templateName: 'order_created_seller',
        variables: {
          orderId: envelope.payload.orderId,
          buyerId,
          amount: totalAmount.amount,
          currency: totalAmount.currency
        }
      })
    })

    // Payment events
    eventBus.subscribe('PaymentSucceeded.v1', async (envelope) => {
      const { orderId, buyerId, amount } = envelope.payload
      await this.sendNotification({
        userId: buyerId,
        type: NotificationType.PAYMENT_UPDATE,
        channel: NotificationChannel.EMAIL,
        templateName: 'payment_successful',
        variables: {
          orderId,
          amount: amount.amount,
          currency: amount.currency
        }
      })
    })

    // User events
    eventBus.subscribe('UserRegistered.v1', async (envelope) => {
      const { userId, email } = envelope.payload
      await this.sendNotification({
        userId,
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.EMAIL,
        templateName: 'welcome_email',
        variables: { email }
      })
    })
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).notification.count()
      return {
        status: 'healthy',
        service: 'notification-service',
        providers: {
          email: this.emailProvider.isHealthy(),
          sms: this.smsProvider.isHealthy(),
          push: this.pushProvider.isHealthy()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'notification-service',
        error: (error as Error).message
      }
    }
  }
}

// Provider Classes (simplified implementations)
class EmailProvider {
  async send(params: { to: string; subject: string; body: string }): Promise<any> {
    // In production, integrate with SendGrid, AWS SES, etc.
    console.log(`Sending email to ${params.to}: ${params.subject}`)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      success: true,
      providerId: 'email_' + Date.now(),
      messageId: uuidv4()
    }
  }

  isHealthy(): boolean {
    // Check provider health
    return true
  }
}

class SMSProvider {
  async send(params: { to: string; message: string }): Promise<any> {
    // In production, integrate with Tanzanian SMS providers like AfricasTalking, SMS Gateway, etc.
    console.log(`Sending SMS to ${params.to}: ${params.message}`)

    // Validate Tanzanian phone number format
    const phoneRegex = /^(\+255|255|0)[67][0-9]{7}$/
    if (!phoneRegex.test(params.to)) {
      throw new Error('Invalid Tanzanian phone number format')
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200))

    return {
      success: true,
      providerId: 'sms_' + Date.now(),
      messageId: uuidv4()
    }
  }

  isHealthy(): boolean {
    return true
  }
}

class PushProvider {
  async send(params: { userId: string; title: string; body: string }): Promise<any> {
    // In production, integrate with Firebase, OneSignal, etc.
    console.log(`Sending push notification to ${params.userId}: ${params.title}`)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 150))

    return {
      success: true,
      providerId: 'push_' + Date.now(),
      messageId: uuidv4()
    }
  }

  isHealthy(): boolean {
    return true
  }
}

class NotificationQueue {
  private queue: any[] = []
  private processing = false
  private notificationService: NotificationService

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService
  }

  async addToQueue(notification: any): Promise<void> {
    this.queue.push(notification)

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing()
    }
  }

  async startProcessing(): Promise<void> {
    if (this.processing) return

    this.processing = true

    while (this.queue.length > 0) {
      const notification = this.queue.shift()

      try {
        // Use reflection to call private method
        await (this.notificationService as any).sendViaChannel(notification)
      } catch (error) {
        console.error('Failed to send notification:', error)
      }

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    this.processing = false
  }
}
