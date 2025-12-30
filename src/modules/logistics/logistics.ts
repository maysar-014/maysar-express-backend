import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { OrderShippedEvent, OrderDeliveredEvent } from '../../../shared-contracts/events'
import { eventBus } from '../../events/eventBus'
import { InventoryService } from '../inventory/inventory'

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled'
}

export interface Address {
  street: string
  city: string
  region: string
  postalCode?: string
  country: string
}

export interface PackageDetails {
  weight?: number // in kg
  dimensions?: {
    length: number
    width: number
    height: number
  } // in cm
  packageCount?: number
}

export interface ShipmentRequest {
  orderId: string
  carrierId: string
  originAddress: Address
  destinationAddress: Address
  packageDetails?: PackageDetails
  shippingCost: number // in cents
  currency?: string
  estimatedDelivery?: Date
}

export interface TrackingUpdate {
  shipmentId: string
  status: ShipmentStatus
  description: string
  location?: string
  carrierData?: any
}

export interface PODData {
  shipmentId: string
  recipientName?: string
  recipientSignature?: string // Base64 encoded
  recipientPhoto?: string // Base64 encoded
  deliveryNotes?: string
  deliveredBy: string
  latitude?: number
  longitude?: number
  accuracy?: number
}

export class LogisticsService {
  private inventoryService: InventoryService

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService

    // Subscribe to events
    eventBus.subscribe('OrderShipped.v1', this.handleOrderShipped.bind(this))
    eventBus.subscribe('OrderDelivered.v1', this.handleOrderDelivered.bind(this))
  }

  // Carrier Management
  async createCarrier(name: string, code: string, config?: {
    apiKey?: string
    apiSecret?: string
    webhookUrl?: string
  }) {
    const carrier = await (prisma as any).carrier.create({
      data: {
        name,
        code,
        ...config
      }
    })
    return carrier
  }

  async getCarriers(activeOnly: boolean = true) {
    const where = activeOnly ? { isActive: true } : {}
    return await (prisma as any).carrier.findMany({
      where,
      orderBy: { name: 'asc' }
    })
  }

  async updateCarrier(carrierId: string, updates: Partial<{
    name: string
    code: string
    isActive: boolean
    apiKey: string
    apiSecret: string
    webhookUrl: string
  }>) {
    return await (prisma as any).carrier.update({
      where: { id: carrierId },
      data: updates
    })
  }

  // Shipment Management
  async createShipment(request: ShipmentRequest): Promise<any> {
    // Generate unique tracking number
    const trackingNumber = this.generateTrackingNumber(request.carrierId)

    // Verify carrier exists and is active
    const carrier = await (prisma as any).carrier.findUnique({
      where: { id: request.carrierId }
    })

    if (!carrier || !carrier.isActive) {
      throw new Error('Invalid or inactive carrier')
    }

    // Check if shipment already exists for this order
    const existingShipment = await (prisma as any).shipment.findUnique({
      where: { orderId: request.orderId }
    })

    if (existingShipment) {
      throw new Error('Shipment already exists for this order')
    }

    const shipment = await (prisma as any).shipment.create({
      data: {
        orderId: request.orderId,
        carrierId: request.carrierId,
        trackingNumber,
        shippingCost: request.shippingCost,
        currency: request.currency || 'TZS',
        estimatedDelivery: request.estimatedDelivery,
        originAddress: request.originAddress,
        destinationAddress: request.destinationAddress,
        weight: request.packageDetails?.weight,
        dimensions: request.packageDetails?.dimensions,
        packageCount: request.packageDetails?.packageCount || 1
      },
      include: {
        carrier: true,
        trackingEvents: true
      }
    })

    // Create initial tracking event
    await this.addTrackingEvent(shipment.id, ShipmentStatus.PENDING, 'Shipment created and ready for pickup')

    return shipment
  }

  async getShipment(shipmentId: string) {
    return await (prisma as any).shipment.findUnique({
      where: { id: shipmentId },
      include: {
        carrier: true,
        trackingEvents: {
          orderBy: { timestamp: 'desc' }
        },
        proofOfDelivery: true
      }
    })
  }

  async getShipmentByOrderId(orderId: string) {
    return await (prisma as any).shipment.findUnique({
      where: { orderId },
      include: {
        carrier: true,
        trackingEvents: {
          orderBy: { timestamp: 'desc' }
        },
        proofOfDelivery: true
      }
    })
  }

  async getShipmentByTrackingNumber(trackingNumber: string) {
    return await (prisma as any).shipment.findUnique({
      where: { trackingNumber },
      include: {
        carrier: true,
        trackingEvents: {
          orderBy: { timestamp: 'desc' }
        },
        proofOfDelivery: true
      }
    })
  }

  // Tracking Management
  async addTrackingEvent(shipmentId: string, status: ShipmentStatus, description: string, location?: string, carrierData?: any) {
    const trackingEvent = await (prisma as any).trackingEvent.create({
      data: {
        shipmentId,
        status,
        description,
        location,
        carrierData,
        timestamp: new Date()
      }
    })

    // Update shipment status
    await (prisma as any).shipment.update({
      where: { id: shipmentId },
      data: { status }
    })

    return trackingEvent
  }

  async updateTracking(update: TrackingUpdate) {
    // Update shipment status
    await (prisma as any).shipment.update({
      where: { id: update.shipmentId },
      data: { status: update.status }
    })

    // Add tracking event
    return await this.addTrackingEvent(
      update.shipmentId,
      update.status,
      update.description,
      update.location,
      update.carrierData
    )
  }

  async getTrackingHistory(shipmentId: string) {
    const trackingEvents = await (prisma as any).trackingEvent.findMany({
      where: { shipmentId },
      orderBy: { timestamp: 'desc' }
    })

    return trackingEvents
  }

  // Proof of Delivery (POD)
  async recordPOD(podData: PODData) {
    const pod = await (prisma as any).pOD.create({
      data: {
        shipmentId: podData.shipmentId,
        recipientName: podData.recipientName,
        recipientSignature: podData.recipientSignature,
        recipientPhoto: podData.recipientPhoto,
        deliveryNotes: podData.deliveryNotes,
        deliveredBy: podData.deliveredBy,
        deliveredAt: new Date(),
        latitude: podData.latitude,
        longitude: podData.longitude,
        accuracy: podData.accuracy
      }
    })

    // Update shipment status to delivered
    await (prisma as any).shipment.update({
      where: { id: podData.shipmentId },
      data: {
        status: ShipmentStatus.DELIVERED,
        actualDelivery: new Date()
      }
    })

    // Add tracking event
    await this.addTrackingEvent(
      podData.shipmentId,
      ShipmentStatus.DELIVERED,
      'Package delivered successfully',
      `${podData.latitude}, ${podData.longitude}`
    )

    return pod
  }

  async getPOD(shipmentId: string) {
    return await (prisma as any).pOD.findMany({
      where: { shipmentId },
      orderBy: { deliveredAt: 'desc' }
    })
  }

  // Event Handlers
  async handleOrderShipped(envelope: EventEnvelope) {
    const event = envelope.payload as OrderShippedEvent

    try {
      // Find shipment for this order
      const shipment = await (prisma as any).shipment.findUnique({
        where: { orderId: event.orderId }
      })

      if (shipment) {
        // Update shipment with carrier tracking info if provided
        if (event.trackingNumber) {
          await (prisma as any).shipment.update({
            where: { id: shipment.id },
            data: { trackingNumber: event.trackingNumber }
          })
        }

        // Add tracking event
        await this.addTrackingEvent(
          shipment.id,
          ShipmentStatus.IN_TRANSIT,
          'Order shipped and in transit'
        )

        // Fulfill inventory reservations
        await this.inventoryService.fulfillReservation(event.orderId)
      }
    } catch (error) {
      console.error(`Failed to handle OrderShipped for order ${event.orderId}:`, error)
    }
  }

  async handleOrderDelivered(envelope: EventEnvelope) {
    const event = envelope.payload as OrderDeliveredEvent

    try {
      // Find shipment for this order
      const shipment = await (prisma as any).shipment.findUnique({
        where: { orderId: event.orderId }
      })

      if (shipment && shipment.status !== ShipmentStatus.DELIVERED) {
        // Update shipment status
        await (prisma as any).shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.DELIVERED,
            actualDelivery: new Date(event.deliveredAt)
          }
        })

        // Add tracking event
        await this.addTrackingEvent(
          shipment.id,
          ShipmentStatus.DELIVERED,
          'Package delivered to customer'
        )
      }
    } catch (error) {
      console.error(`Failed to handle OrderDelivered for order ${event.orderId}:`, error)
    }
  }

  // Carrier Integration (Future)
  async updateCarrierStatus(carrierId: string, shipmentId: string, statusData: any) {
    // This would integrate with carrier APIs
    // For now, just update based on webhook data

    const status = this.mapCarrierStatus(statusData.status)
    const description = statusData.description || `Status update from ${statusData.carrier}`

    return await this.updateTracking({
      shipmentId,
      status,
      description,
      location: statusData.location,
      carrierData: statusData
    })
  }

  private mapCarrierStatus(carrierStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'picked_up': ShipmentStatus.PICKED_UP,
      'in_transit': ShipmentStatus.IN_TRANSIT,
      'out_for_delivery': ShipmentStatus.OUT_FOR_DELIVERY,
      'delivered': ShipmentStatus.DELIVERED,
      'failed': ShipmentStatus.FAILED,
      'returned': ShipmentStatus.RETURNED
    }

    return statusMap[carrierStatus.toLowerCase()] || ShipmentStatus.IN_TRANSIT
  }

  // Utility Methods
  private generateTrackingNumber(carrierId: string): string {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `MYS${carrierId.slice(-2).toUpperCase()}${timestamp}${random}`
  }

  // Analytics and Reporting
  async getShipmentStats(filters?: {
    carrierId?: string
    status?: ShipmentStatus
    fromDate?: Date
    toDate?: Date
  }) {
    const where: any = {}

    if (filters?.carrierId) where.carrierId = filters.carrierId
    if (filters?.status) where.status = filters.status
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {}
      if (filters.fromDate) where.createdAt.gte = filters.fromDate
      if (filters.toDate) where.createdAt.lte = filters.toDate
    }

    const [
      totalShipments,
      shipmentsByStatus,
      averageDeliveryTime,
      onTimeDeliveries
    ] = await Promise.all([
      (prisma as any).shipment.count({ where }),
      (prisma as any).shipment.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      this.calculateAverageDeliveryTime(where),
      this.calculateOnTimeDeliveries(where)
    ])

    return {
      totalShipments,
      shipmentsByStatus: shipmentsByStatus.reduce((acc: any, stat: any) => {
        acc[stat.status] = stat._count
        return acc
      }, {}),
      averageDeliveryTime,
      onTimeDeliveries
    }
  }

  private async calculateAverageDeliveryTime(where: any): Promise<number> {
    // Calculate average time between creation and delivery
    const deliveredShipments = await (prisma as any).shipment.findMany({
      where: {
        ...where,
        status: ShipmentStatus.DELIVERED,
        actualDelivery: { not: null }
      },
      select: {
        createdAt: true,
        actualDelivery: true
      }
    })

    if (deliveredShipments.length === 0) return 0

    const totalTime = deliveredShipments.reduce((sum: number, shipment: any) => {
      return sum + (new Date(shipment.actualDelivery).getTime() - new Date(shipment.createdAt).getTime())
    }, 0)

    return totalTime / deliveredShipments.length / (1000 * 60 * 60) // hours
  }

  private async calculateOnTimeDeliveries(where: any): Promise<number> {
    const shipments = await (prisma as any).shipment.findMany({
      where: {
        ...where,
        status: ShipmentStatus.DELIVERED,
        estimatedDelivery: { not: null },
        actualDelivery: { not: null }
      },
      select: {
        estimatedDelivery: true,
        actualDelivery: true
      }
    })

    const onTime = shipments.filter((shipment: any) =>
      new Date(shipment.actualDelivery) <= new Date(shipment.estimatedDelivery)
    ).length

    return shipments.length > 0 ? (onTime / shipments.length) * 100 : 0
  }

  // Health check
  async healthCheck() {
    try {
      await (prisma as any).shipment.count()
      return {
        status: 'healthy',
        service: 'logistics-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'logistics-service',
        error: (error as Error).message
      }
    }
  }
}
