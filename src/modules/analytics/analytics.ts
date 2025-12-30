import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { eventBus } from '../../events/eventBus'

export enum MetricPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel'
}

export interface EventFactData {
  eventType: string
  eventId: string
  aggregateId: string
  eventData: any
  metadata?: any
  version?: string
}

export interface MetricData {
  name: string
  value: number
  dimensions?: Record<string, any>
  source: string
  tags?: string[]
}

export interface DashboardConfig {
  name: string
  description?: string
  widgets: Array<{
    id: string
    type: string
    title: string
    config: any
    position: { x: number; y: number; width: number; height: number }
  }>
  filters?: Record<string, any>
  refreshInterval?: number
}

export interface AlertCondition {
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  threshold: number
  duration?: number // minutes
}

export interface ReportConfig {
  name: string
  type: 'scheduled' | 'on_demand' | 'automated'
  metrics: string[]
  filters: Record<string, any>
  format: ReportFormat
  schedule?: {
    cron: string
    timezone: string
  }
  recipients: string[]
}

export interface AnalyticsQuery {
  metrics?: string[]
  dimensions?: string[]
  filters?: Record<string, any>
  groupBy?: string[]
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  dateRange?: {
    from: Date
    to: Date
  }
}

export interface AnalyticsResult {
  data: any[]
  metadata: {
    total: number
    queryTime: number
    dateRange: { from: Date; to: Date }
  }
}

export interface BusinessMetrics {
  revenue: {
    total: number
    growth: number
    averageOrderValue: number
    ordersCount: number
  }
  users: {
    total: number
    active: number
    new: number
    retention: number
  }
  products: {
    total: number
    active: number
    topSelling: Array<{ productId: string; name: string; sales: number }>
  }
  sellers: {
    total: number
    active: number
    topPerformers: Array<{ sellerId: string; name: string; revenue: number }>
  }
}

export class AnalyticsService {
  private metricCache: Map<string, { value: any; timestamp: Date }> = new Map()
  private alertCooldowns: Map<string, Date> = new Map()

  constructor() {
    // Subscribe to all platform events
    this.setupEventListeners()

    // Start background jobs
    this.startBackgroundJobs()
  }

  // Event Fact Storage
  async storeEventFact(eventFact: EventFactData): Promise<any> {
    const fact = await (prisma as any).eventFact.create({
      data: {
        eventType: eventFact.eventType,
        eventId: eventFact.eventId,
        aggregateId: eventFact.aggregateId,
        eventData: eventFact.eventData,
        metadata: eventFact.metadata || {},
        version: eventFact.version || 'v1',
        timestamp: new Date(),
        processedAt: new Date()
      }
    })

    // Trigger real-time metric updates
    await this.processEventForMetrics(eventFact)

    return fact
  }

  async getEventFacts(query: {
    eventType?: string
    aggregateId?: string
    fromDate?: Date
    toDate?: Date
    limit?: number
    offset?: number
  } = {}): Promise<any[]> {
    const where: any = {}

    if (query.eventType) where.eventType = query.eventType
    if (query.aggregateId) where.aggregateId = query.aggregateId
    if (query.fromDate || query.toDate) {
      where.timestamp = {}
      if (query.fromDate) where.timestamp.gte = query.fromDate
      if (query.toDate) where.timestamp.lte = query.toDate
    }

    return await (prisma as any).eventFact.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit || 100,
      skip: query.offset || 0
    })
  }

  // Real-time Metrics
  async recordMetric(metric: MetricData): Promise<any> {
    const metricRecord = await (prisma as any).metric.create({
      data: {
        name: metric.name,
        value: metric.value,
        dimensions: metric.dimensions || {},
        source: metric.source,
        tags: metric.tags || [],
        timestamp: new Date()
      }
    })

    // Update cache
    const cacheKey = `${metric.name}:${JSON.stringify(metric.dimensions)}`
    this.metricCache.set(cacheKey, {
      value: metric.value,
      timestamp: new Date()
    })

    // Check alerts
    await this.checkAlerts(metric.name, metric.value, metric.dimensions)

    return metricRecord
  }

  async getMetric(
    name: string,
    dimensions?: Record<string, any>,
    fromDate?: Date,
    toDate?: Date
  ): Promise<any[]> {
    const where: any = { name }

    if (dimensions) {
      // This would need more complex logic for dimension matching
      where.dimensions = dimensions
    }

    if (fromDate || toDate) {
      where.timestamp = {}
      if (fromDate) where.timestamp.gte = fromDate
      if (toDate) where.timestamp.lte = toDate
    }

    return await (prisma as any).metric.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    })
  }

  async aggregateMetrics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now()

    // Build complex aggregation query
    let metrics = query.metrics || []
    if (metrics.length === 0) {
      // Get all available metrics if none specified
      const distinctMetrics = await (prisma as any).metric.findMany({
        select: { name: true },
        distinct: ['name']
      })
      metrics = distinctMetrics.map((m: any) => m.name)
    }

    const results = []

    for (const metricName of metrics) {
      const where: any = { name: metricName }

      // Apply filters
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          if (key === 'source') {
            where.source = value
          } else if (key === 'tags') {
            where.tags = { hasSome: value as string[] }
          }
        }
      }

      // Date range
      if (query.dateRange) {
        where.timestamp = {
          gte: query.dateRange.from,
          lte: query.dateRange.to
        }
      }

      // Group by dimensions if specified
      if (query.groupBy && query.groupBy.length > 0) {
        const grouped = await (prisma as any).metric.groupBy({
          by: query.groupBy,
          where,
          _avg: { value: true },
          _sum: { value: true },
          _count: true,
          _min: { value: true },
          _max: { value: true }
        })

        results.push({
          metric: metricName,
          grouped: grouped.map((g: any) => ({
            dimensions: g,
            avg: g._avg.value,
            sum: g._sum.value,
            count: g._count,
            min: g._min.value,
            max: g._max.value
          }))
        })
      } else {
        const aggregated = await (prisma as any).metric.aggregate({
          where,
          _avg: { value: true },
          _sum: { value: true },
          _count: true,
          _min: { value: true },
          _max: { value: true }
        })

        results.push({
          metric: metricName,
          aggregated: {
            avg: aggregated._avg.value,
            sum: aggregated._sum.value,
            count: aggregated._count,
            min: aggregated._min.value,
            max: aggregated._max.value
          }
        })
      }
    }

    return {
      data: results,
      metadata: {
        total: results.length,
        queryTime: Date.now() - startTime,
        dateRange: query.dateRange || { from: new Date(0), to: new Date() }
      }
    }
  }

  // Business Intelligence
  async getBusinessMetrics(period: MetricPeriod = MetricPeriod.DAILY): Promise<BusinessMetrics> {
    const now = new Date()
    const periodStart = this.getPeriodStart(now, period)

    // Revenue metrics
    const revenueMetrics = await (prisma as any).revenueMetric.findFirst({
      where: {
        period,
        periodStart: {
          gte: periodStart,
          lt: now
        }
      },
      orderBy: { periodStart: 'desc' }
    })

    // Previous period for growth calculation
    const prevPeriodStart = this.getPeriodStart(periodStart, period)
    const prevRevenueMetrics = await (prisma as any).revenueMetric.findFirst({
      where: {
        period,
        periodStart: {
          gte: prevPeriodStart,
          lt: periodStart
        }
      },
      orderBy: { periodStart: 'desc' }
    })

    const growth = prevRevenueMetrics ?
      ((revenueMetrics.totalRevenue - prevRevenueMetrics.totalRevenue) / prevRevenueMetrics.totalRevenue) * 100 : 0

    // User metrics
    const totalUsers = await (prisma as any).user.count()
    const activeUsers = await (prisma as any).userSession.findMany({
      where: {
        startedAt: { gte: periodStart }
      },
      select: { userId: true },
      distinct: ['userId']
    }).then((sessions: Array<{ userId: string }>) => sessions.length)

    // New users this period
    const newUsers = await (prisma as any).user.count({
      where: {
        createdAt: { gte: periodStart }
      }
    })

    // Product metrics
    const totalProducts = await (prisma as any).product.count()
    const activeProducts = await (prisma as any).product.count({
      where: { status: 'published' }
    })

    // Top selling products (would need sales data aggregation)
    const topSelling: Array<{ productId: string; name: string; sales: number }> = [] // Placeholder

    // Seller metrics
    const totalSellers = await (prisma as any).seller.count()
    const activeSellers = await (prisma as any).seller.count({
      where: { status: 'active' }
    })

    // Top performing sellers (would need revenue data aggregation)
    const topPerformers: Array<{ sellerId: string; name: string; revenue: number }> = [] // Placeholder

    return {
      revenue: {
        total: revenueMetrics?.totalRevenue || 0,
        growth,
        averageOrderValue: revenueMetrics?.averageOrderValue || 0,
        ordersCount: revenueMetrics?.orderCount || 0
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        retention: 0 // Would need more complex calculation
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        topSelling
      },
      sellers: {
        total: totalSellers,
        active: activeSellers,
        topPerformers
      }
    }
  }

  // Dashboard Management
  async createDashboard(dashboard: DashboardConfig, createdBy: string): Promise<any> {
    return await (prisma as any).dashboard.create({
      data: {
        name: dashboard.name,
        description: dashboard.description,
        config: dashboard,
        createdBy,
        tags: dashboard.widgets?.map(w => w.type) || []
      }
    })
  }

  async getDashboard(dashboardId: string): Promise<any> {
    return await (prisma as any).dashboard.findUnique({
      where: { id: dashboardId }
    })
  }

  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>): Promise<any> {
    return await (prisma as any).dashboard.update({
      where: { id: dashboardId },
      data: {
        config: updates,
        updatedAt: new Date()
      }
    })
  }

  async listDashboards(userId?: string): Promise<any[]> {
    const where: any = {}

    if (userId) {
      where.OR = [
        { createdBy: userId },
        { isPublic: true }
      ]
    } else {
      where.isPublic = true
    }

    return await (prisma as any).dashboard.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
  }

  // Automated Reporting
  async createReport(config: ReportConfig, createdBy: string): Promise<any> {
    const nextRunAt = config.schedule ? this.calculateNextRun(config.schedule) : null

    return await (prisma as any).report.create({
      data: {
        name: config.name,
        type: config.type,
        config,
        schedule: config.schedule,
        recipients: config.recipients,
        nextRunAt,
        createdBy
      }
    })
  }

  async executeReport(reportId: string): Promise<any> {
    const report = await (prisma as any).report.findUnique({
      where: { id: reportId }
    })

    if (!report) {
      throw new Error('Report not found')
    }

    const config = report.config as ReportConfig

    // Generate report data
    const reportData = await this.generateReportData(config)

    // Format report
    const formattedReport = await this.formatReport(reportData, config.format)

    // Send to recipients
    await this.distributeReport(formattedReport, config.recipients)

    // Update report status
    await (prisma as any).report.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: report.schedule ? this.calculateNextRun(report.schedule as any) : null
      }
    })

    return {
      reportId,
      data: reportData,
      recipients: config.recipients
    }
  }

  // Alert Management
  async createAlert(alert: {
    name: string
    description?: string
    metric: string
    condition: AlertCondition
    severity: AlertSeverity
    channels: string[]
    cooldownMinutes?: number
    createdBy: string
  }): Promise<any> {
    return await (prisma as any).alert.create({
      data: {
        name: alert.name,
        description: alert.description,
        metric: alert.metric,
        condition: alert.condition,
        severity: alert.severity,
        channels: alert.channels,
        cooldownMinutes: alert.cooldownMinutes || 60,
        createdBy: alert.createdBy
      }
    })
  }

  async getAlerts(activeOnly: boolean = true): Promise<any[]> {
    const where: any = {}
    if (activeOnly) where.isActive = true

    return await (prisma as any).alert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
  }

  // User Behavior Analytics
  async trackUserSession(session: {
    userId: string
    sessionId: string
    deviceInfo: any
    location?: any
    startedAt: Date
    events: any[]
  }): Promise<any> {
    // Calculate session duration if ended
    const duration = session.events.length > 0 ?
      Math.max(...session.events.map((e: any) => e.timestamp || 0)) - session.startedAt.getTime() : null

    return await (prisma as any).userSession.create({
      data: {
        userId: session.userId,
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        location: session.location,
        startedAt: session.startedAt,
        duration: duration ? Math.floor(duration / 1000) : null,
        pageViews: session.events.length,
        events: session.events
      }
    })
  }

  async trackProductView(view: {
    productId: string
    userId?: string
    sessionId?: string
    source?: string
    duration?: number
    interacted?: boolean
  }): Promise<any> {
    return await (prisma as any).productView.create({
      data: {
        productId: view.productId,
        userId: view.userId,
        sessionId: view.sessionId,
        source: view.source,
        duration: view.duration,
        interacted: view.interacted,
        timestamp: new Date()
      }
    })
  }

  // Performance Monitoring
  async trackPerformanceMetric(metric: {
    service: string
    endpoint: string
    method: string
    responseTime: number
    statusCode: number
    userId?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<any> {
    return await (prisma as any).performanceMetric.create({
      data: {
        service: metric.service,
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime,
        statusCode: metric.statusCode,
        userId: metric.userId,
        ipAddress: metric.ipAddress,
        userAgent: metric.userAgent,
        timestamp: new Date()
      }
    })
  }

  // Revenue Analytics
  async calculateRevenueMetrics(period: MetricPeriod): Promise<any> {
    const now = new Date()
    const periodStart = this.getPeriodStart(now, period)
    const periodEnd = now

    // Get orders in this period
    const orders = await (prisma as any).order.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lt: periodEnd
        },
        status: 'paid'
      },
      include: {
        items: true
      }
    })

    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0)
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? Math.floor(totalRevenue / orderCount) : 0

    // Revenue breakdown (simplified)
    const breakdown = {
      byPaymentMethod: {},
      byCategory: {},
      bySeller: {}
    }

    // Calculate growth from previous period
    const prevPeriodStart = this.getPeriodStart(periodStart, period)
    const prevOrders = await (prisma as any).order.count({
      where: {
        createdAt: {
          gte: prevPeriodStart,
          lt: periodStart
        },
        status: 'paid'
      }
    })

    const growth = prevOrders > 0 ? ((orderCount - prevOrders) / prevOrders) * 100 : 0

    return await (prisma as any).revenueMetric.create({
      data: {
        period,
        periodStart,
        periodEnd,
        totalRevenue,
        orderCount,
        averageOrderValue,
        breakdown,
        growth
      }
    })
  }

  // Private Helper Methods
  private async processEventForMetrics(eventFact: EventFactData): Promise<void> {
    const { eventType, eventData, aggregateId } = eventFact

    // Convert events to metrics based on type
    switch (eventType) {
      case 'UserRegistered':
        await this.recordMetric({
          name: 'user_registrations',
          value: 1,
          dimensions: { role: eventData.role },
          source: 'auth-service',
          tags: ['users']
        })
        break

      case 'OrderCreated':
        await this.recordMetric({
          name: 'orders_created',
          value: 1,
          dimensions: { buyerId: eventData.buyerId },
          source: 'order-service',
          tags: ['orders', 'revenue']
        })
        break

      case 'OrderPaid':
        await this.recordMetric({
          name: 'orders_paid',
          value: 1,
          dimensions: { amount: eventData.amount.amount, currency: eventData.amount.currency },
          source: 'payment-service',
          tags: ['orders', 'revenue', 'payments']
        })
        break

      case 'PaymentSucceeded':
        await this.recordMetric({
          name: 'payments_succeeded',
          value: eventData.amount.amount,
          dimensions: { method: eventData.method, currency: eventData.amount.currency },
          source: 'payment-service',
          tags: ['payments', 'revenue']
        })
        break

      case 'ProductPublished':
        await this.recordMetric({
          name: 'products_published',
          value: 1,
          dimensions: { sellerId: eventData.sellerId },
          source: 'catalog-service',
          tags: ['products', 'catalog']
        })
        break
    }
  }

  private async checkAlerts(metricName: string, value: number, dimensions?: any): Promise<void> {
    const alerts = await (prisma as any).alert.findMany({
      where: {
        metric: metricName,
        isActive: true
      }
    })

    for (const alert of alerts) {
      const condition = alert.condition as AlertCondition

      // Check if alert condition is met
      const isTriggered = this.evaluateAlertCondition(value, condition)

      if (isTriggered) {
        // Check cooldown
        const cooldownKey = `${alert.id}:${metricName}`
        const lastTriggered = this.alertCooldowns.get(cooldownKey)

        if (!lastTriggered || Date.now() - lastTriggered.getTime() > (alert.cooldownMinutes * 60 * 1000)) {
          // Trigger alert
          await this.triggerAlert(alert, value, dimensions)

          // Update cooldown
          this.alertCooldowns.set(cooldownKey, new Date())

          // Update last triggered
          await (prisma as any).alert.update({
            where: { id: alert.id },
            data: { lastTriggeredAt: new Date() }
          })
        }
      }
    }
  }

  private evaluateAlertCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold
      case 'gte': return value >= condition.threshold
      case 'lt': return value < condition.threshold
      case 'lte': return value <= condition.threshold
      case 'eq': return value === condition.threshold
      case 'neq': return value !== condition.threshold
      default: return false
    }
  }

  private async triggerAlert(alert: any, value: number, dimensions?: any): Promise<void> {
    const message = `Alert: ${alert.name} - ${alert.metric} is ${value} (threshold: ${alert.condition.threshold})`

    // Send to configured channels
    for (const channel of alert.channels) {
      switch (channel) {
        case 'email':
          // Send email notification
          console.log(`Sending email alert: ${message}`)
          break
        case 'sms':
          // Send SMS notification
          console.log(`Sending SMS alert: ${message}`)
          break
        case 'webhook':
          // Send webhook notification
          console.log(`Sending webhook alert: ${message}`)
          break
      }
    }
  }

  private async generateReportData(config: ReportConfig): Promise<any> {
    const query: AnalyticsQuery = {
      metrics: config.metrics,
      filters: config.filters,
      dateRange: config.filters.dateRange
    }

    const result = await this.aggregateMetrics(query)
    return result.data
  }

  private async formatReport(data: any, format: ReportFormat): Promise<any> {
    switch (format) {
      case ReportFormat.JSON:
        return { data, format: 'json' }
      case ReportFormat.CSV:
        // Convert to CSV format
        return { data: this.convertToCSV(data), format: 'csv' }
      case ReportFormat.PDF:
        // Generate PDF (would use a library)
        return { data, format: 'pdf' }
      case ReportFormat.EXCEL:
        // Generate Excel (would use a library)
        return { data, format: 'excel' }
      default:
        return { data, format: 'json' }
    }
  }

  private async distributeReport(report: any, recipients: string[]): Promise<void> {
    // Send report to recipients via email
    console.log(`Distributing report to ${recipients.length} recipients`)
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion (would be more sophisticated in production)
    return JSON.stringify(data)
  }

  private calculateNextRun(schedule: { cron: string; timezone: string }): Date {
    // Simple implementation - would use a cron library in production
    const now = new Date()
    return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Daily
  }

  private getPeriodStart(date: Date, period: MetricPeriod): Date {
    const d = new Date(date)

    switch (period) {
      case MetricPeriod.HOURLY:
        d.setMinutes(0, 0, 0)
        break
      case MetricPeriod.DAILY:
        d.setHours(0, 0, 0, 0)
        break
      case MetricPeriod.WEEKLY:
        d.setDate(d.getDate() - d.getDay())
        d.setHours(0, 0, 0, 0)
        break
      case MetricPeriod.MONTHLY:
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        break
    }

    return d
  }

  private setupEventListeners(): void {
    // Listen to all major platform events for analytics
    const events = [
      'UserRegistered', 'UserSuspended',
      'OrderCreated', 'OrderPaid', 'OrderShipped', 'OrderDelivered', 'OrderCancelled',
      'PaymentSucceeded', 'RefundCompleted',
      'ProductPublished', 'SellerVerified',
      'CommissionEarned', 'DisputeOpened', 'DisputeResolved'
    ]

    for (const eventType of events) {
      eventBus.subscribe(`${eventType}.v1`, async (envelope: EventEnvelope) => {
        await this.storeEventFact({
          eventType,
          eventId: envelope.eventId,
          aggregateId: envelope.payload.id || envelope.payload.userId || envelope.payload.orderId,
          eventData: envelope.payload,
          metadata: {
            producer: envelope.producer,
            timestamp: envelope.timestamp
          }
        })
      })
    }
  }

  private startBackgroundJobs(): void {
    // Revenue metrics calculation
    setInterval(async () => {
      try {
        await this.calculateRevenueMetrics(MetricPeriod.DAILY)
        await this.calculateRevenueMetrics(MetricPeriod.WEEKLY)
        await this.calculateRevenueMetrics(MetricPeriod.MONTHLY)
      } catch (error) {
        console.error('Error calculating revenue metrics:', error)
      }
    }, 60 * 60 * 1000) // Every hour

    // Clean up old data (90 days retention for metrics)
    setInterval(async () => {
      try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        await (prisma as any).metric.deleteMany({
          where: { timestamp: { lt: ninetyDaysAgo } }
        })

        await (prisma as any).performanceMetric.deleteMany({
          where: { timestamp: { lt: ninetyDaysAgo } }
        })
      } catch (error) {
        console.error('Error cleaning up old data:', error)
      }
    }, 24 * 60 * 60 * 1000) // Daily
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).eventFact.count()
      return {
        status: 'healthy',
        service: 'analytics-service',
        metrics: {
          cachedMetrics: this.metricCache.size,
          activeAlerts: this.alertCooldowns.size
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'analytics-service',
        error: (error as Error).message
      }
    }
  }
}
