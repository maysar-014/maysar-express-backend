import { IDeliveryRepository, ICourierRepository } from '../../domain/repositories';

export interface GetDeliveriesInput {
  page?: number;
  limit?: number;
  status?: string;
  courierId?: string;
  orderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DeliverySummary {
  deliveryId: string;
  orderId: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  courier: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
  } | null;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  estimatedPickupTime: Date;
  actualPickupTime?: Date | null;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date | null;
  weight: number;
  priority: 'standard' | 'express' | 'urgent';
  specialRequirements?: string[];
  routeDistance: number;
  routeDuration: number;
  totalCost: number;
  trackingNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetDeliveriesOutput {
  deliveries: DeliverySummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    status?: string;
    courierId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export class GetDeliveriesUseCase {
  constructor(
    private deliveryRepository: IDeliveryRepository,
    private courierRepository: ICourierRepository
  ) { }

  async execute(input: GetDeliveriesInput): Promise<GetDeliveriesOutput> {
    const page = input.page || 1;
    const limit = input.limit || 10;

    // Get deliveries from repository
    let deliveries: any[];
    if (input.status) {
      deliveries = await this.deliveryRepository.findByStatus(input.status);
    } else if (input.courierId) {
      deliveries = await this.deliveryRepository.findByCourierId(input.courierId);
    } else {
      // Only pass timeRange if both dates are defined
      const timeRange = (input.dateFrom && input.dateTo) ? {
        start: input.dateFrom,
        end: input.dateTo
      } : undefined;
      deliveries = await this.deliveryRepository.findAll(timeRange);
    }

    // Filter by orderId if provided (repository may not support this natively)
    if (input.orderId) {
      deliveries = deliveries.filter((d: any) => d.orderId === input.orderId);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDeliveries = deliveries.slice(startIndex, endIndex);

    // Get courier information for each delivery
    const deliveriesWithCourierInfo = await Promise.all(
      paginatedDeliveries.map(async (delivery) => {
        const courier = await this.courierRepository.findById(delivery.courierId);
        return {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          status: delivery.status,
          courier: courier ? {
            id: courier.id,
            name: courier.name,
            phone: courier.phone,
            vehicleType: courier.vehicle?.type || 'unknown'
          } : null,
          pickupLocation: {
            lat: delivery.pickupLocation.getCoordinates().lat,
            lng: delivery.pickupLocation.getCoordinates().lng,
            address: delivery.pickupLocation.getAddress()
          },
          deliveryLocation: {
            lat: delivery.deliveryLocation.getCoordinates().lat,
            lng: delivery.deliveryLocation.getCoordinates().lng,
            address: delivery.deliveryLocation.getAddress()
          },
          estimatedPickupTime: delivery.estimatedPickupTime,
          actualPickupTime: delivery.actualPickupTime,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime,
          actualDeliveryTime: delivery.actualDeliveryTime,
          weight: delivery.weight,
          priority: delivery.priority,
          specialRequirements: delivery.specialRequirements,
          routeDistance: delivery.routeDistance,
          routeDuration: delivery.routeDuration,
          totalCost: delivery.totalCost,
          trackingNumber: `TRK${delivery.id.toUpperCase()}`,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt
        };
      })
    );

    return {
      deliveries: deliveriesWithCourierInfo,
      total: deliveries.length,
      page,
      limit,
      totalPages: Math.ceil(deliveries.length / limit),
      filters: {
        status: input.status,
        courierId: input.courierId,
        orderId: input.orderId,
        dateFrom: input.dateFrom?.toISOString(),
        dateTo: input.dateTo?.toISOString()
      }
    };
  }
}
