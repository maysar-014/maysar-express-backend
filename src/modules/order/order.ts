import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope, Money } from '../../../shared-contracts/types'
import {
  OrderCreatedEvent,
  PaymentSucceededEvent,
  OrderPaidEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent
} from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'
import { PaymentService } from '../payment/payment'

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface OrderItem {
  productId: string
  quantity: number
  price: Money
  name?: string
  sku?: string
}

export interface OrderFilters {
  buyerId?: string
  sellerId?: string
  status?: OrderStatus
  fromDate?: Date
  toDate?: Date
  minAmount?: number
  maxAmount?: number
}

export interface ShippingInfo {
  carrier: string
  trackingNumber: string
  estimatedDelivery?: Date
  shippingCost: Money
}

export class OrderService {
  private paymentService: PaymentService

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService
    // Subscribe to events
    eventBus.subscribe('PaymentSucceeded.v1', {
      name: 'order-service-payment-handler',
      handler: this.handlePaymentSucceeded.bind(this)
    })
    eventBus.subscribe('OrderShipped.v1', {
      name: 'order-service-shipping-handler',
      handler: this.handleOrderShipped.bind(this)
    })
    eventBus.subscribe('OrderDelivered.v1', {
      name: 'order-service-delivery-handler',
      handler: this.handleOrderDelivered.bind(this)
    })
  }

  async createOrder(buyerId: string, sellerId: string, items: Array<{ productId: string; quantity: number; price: Money }>) {
    const totalAmount = items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0)
    const currency = items[0]?.price.currency || 'TZS'

    const order = await (prisma as any).order.create({
      data: {
        buyerId,
        sellerId,
        totalAmount,
        currency,
        status: 'pending'
      }
    })

    // Create order items
    for (const item of items) {
      await (prisma as any).orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.amount,
          currency: item.price.currency
        }
      })
    }

    // Emit OrderCreated using helper function
    const envelope = eventBus.createEventEnvelope<OrderCreatedEvent>('OrderCreated', {
      orderId: order.id,
      buyerId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: { amount: totalAmount, currency }
    })

    eventBus.publish(envelope)

    return order
  }

  async handlePaymentSucceeded(envelope: EventEnvelope) {
    const event = envelope.payload as PaymentSucceededEvent
    const order = await (prisma as any).order.findUnique({ where: { id: event.orderId } })
    if (!order) return

    await (prisma as any).order.update({
      where: { id: event.orderId },
      data: { status: 'paid' }
    })

    // Emit OrderPaid using helper function
    const orderPaidEnvelope = eventBus.createEventEnvelope<OrderPaidEvent>('OrderPaid', {
      orderId: event.orderId,
      buyerId: order.buyerId,
      amount: event.amount,
      paymentId: event.paymentId
    })

    eventBus.publish(orderPaidEnvelope)
  }

  async payOrder(orderId: string) {
    const order = await (prisma as any).order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')

    const amount: Money = { amount: order.totalAmount, currency: order.currency }

    return await this.paymentService.processPayment(orderId, order.buyerId, amount)
  }

  // Order lifecycle management
  async cancelOrder(orderId: string, reason: string, cancelledBy: string) {
    const order = await (prisma as any).order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')

    // Only allow cancellation of pending or paid orders
    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel shipped or delivered orders')
    }

    await (prisma as any).order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED
      }
    })

    // Emit OrderCancelled event using helper function
    const envelope = eventBus.createEventEnvelope<OrderCancelledEvent>('OrderCancelled', {
      orderId: orderId,
      cancelledAt: new Date().toISOString(),
      reason: reason,
      cancelledBy: cancelledBy
    })

    eventBus.publish(envelope)

    // TODO: Trigger inventory reservation cancellation
    // TODO: Handle refund if already paid

    return { success: true, orderId }
  }

  async shipOrder(orderId: string, shippingInfo: ShippingInfo, shippedBy: string) {
    const order = await (prisma as any).order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')

    if (order.status !== OrderStatus.PAID) {
      throw new Error('Order must be paid before shipping')
    }

    await (prisma as any).order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED
      }
    })

    // Emit OrderShipped event using helper function
    const envelope = eventBus.createEventEnvelope<OrderShippedEvent>('OrderShipped', {
      orderId: orderId,
      logisticsId: shippedBy,
      trackingNumber: shippingInfo.trackingNumber
    })

    eventBus.publish(envelope)

    return { success: true, orderId, trackingNumber: shippingInfo.trackingNumber }
  }

  async deliverOrder(orderId: string, deliveredBy: string, deliveryNotes?: string) {
    const order = await (prisma as any).order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')

    if (order.status !== OrderStatus.SHIPPED) {
      throw new Error('Order must be shipped before delivery')
    }

    await (prisma as any).order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED
      }
    })

    // Emit OrderDelivered event using helper function
    const envelope = eventBus.createEventEnvelope<OrderDeliveredEvent>('OrderDelivered', {
      orderId: orderId,
      deliveredAt: new Date().toISOString()
    })

    eventBus.publish(envelope)

    return { success: true, orderId, deliveredAt: new Date().toISOString() }
  }

  // Event handlers
  async handleOrderShipped(envelope: EventEnvelope) {
    const event = envelope.payload as OrderShippedEvent
    // Update order status if not already updated
    const order = await (prisma as any).order.findUnique({ where: { id: event.orderId } })
    if (order && order.status === OrderStatus.PAID) {
      await (prisma as any).order.update({
        where: { id: event.orderId },
        data: { status: OrderStatus.SHIPPED }
      })
    }
  }

  async handleOrderDelivered(envelope: EventEnvelope) {
    const event = envelope.payload as OrderDeliveredEvent
    // Update order status if not already updated
    const order = await (prisma as any).order.findUnique({ where: { id: event.orderId } })
    if (order && order.status === OrderStatus.SHIPPED) {
      await (prisma as any).order.update({
        where: { id: event.orderId },
        data: { status: OrderStatus.DELIVERED }
      })
    }
  }

  // Order queries and analytics
  async getOrderById(orderId: string, includeItems: boolean = true) {
    const include = includeItems ? { items: true } : {}
    return await (prisma as any).order.findUnique({
      where: { id: orderId },
      include
    })
  }

  async getOrders(filters: OrderFilters, page: number = 1, limit: number = 20) {
    const where: any = {}

    if (filters.buyerId) where.buyerId = filters.buyerId
    if (filters.sellerId) where.sellerId = filters.sellerId
    if (filters.status) where.status = filters.status
    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {}
      if (filters.minAmount) where.totalAmount.gte = filters.minAmount
      if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const orders = await (prisma as any).order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await (prisma as any).order.count({ where })

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getOrderHistory(orderId: string) {
    // In a real implementation, you'd have an order_history table
    // For now, return the order with status changes
    const order = await this.getOrderById(orderId)
    return {
      orderId,
      currentStatus: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // TODO: Implement actual history tracking
      history: [
        { status: 'pending', timestamp: order.createdAt },
        { status: order.status, timestamp: order.updatedAt }
      ]
    }
  }

  // Validation and business rules
  async validateOrderItems(items: OrderItem[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!items || items.length === 0) {
      errors.push('Order must contain at least one item')
      return { valid: false, errors }
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for product ${item.productId}`)
      }
      if (item.price.amount <= 0) {
        errors.push(`Invalid price for product ${item.productId}`)
      }
    }

    // TODO: Check product availability, pricing, etc.
    // This would integrate with Catalog and Inventory services

    return { valid: errors.length === 0, errors }
  }

  // Analytics and reporting
  async getOrderStats(filters?: OrderFilters) {
    const where: any = {}

    if (filters?.buyerId) where.buyerId = filters.buyerId
    if (filters?.sellerId) where.sellerId = filters.sellerId
    if (filters?.status) where.status = filters.status
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters?.fromDate) where.createdAt.gte = filters.fromDate
      if (filters?.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      averageOrderValue
    ] = await Promise.all([
      (prisma as any).order.count({ where }),
      (prisma as any).order.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      (prisma as any).order.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      (prisma as any).order.aggregate({
        where,
        _avg: { totalAmount: true }
      })
    ])

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      averageOrderValue: averageOrderValue._avg.totalAmount || 0,
      ordersByStatus: ordersByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {})
    }
  }

  // Bulk operations
  async bulkUpdateOrderStatus(orderIds: string[], newStatus: OrderStatus, reason: string) {
    const results = []

    for (const orderId of orderIds) {
      try {
        await (prisma as any).order.update({
          where: { id: orderId },
          data: { status: newStatus }
        })
        results.push({ orderId, success: true })
      } catch (error) {
        results.push({ orderId, success: false, error: (error as Error).message })
      }
    }

    return results
  }

  // Health check
  async healthCheck() {
    try {
      await (prisma as any).order.count()
      return { status: 'healthy', service: 'order-service' }
    } catch (error) {
      return { status: 'unhealthy', service: 'order-service', error: (error as Error).message }
    }
  }
}
