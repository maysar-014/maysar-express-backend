import { IDeliveryRepository, ICourierRepository } from '../../domain/repositories';

export interface GetDeliveryInput {
  deliveryId: string;
}

export interface GetDeliveryOutput {
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
  actualPickupTime?: Date;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
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

export class GetDeliveryUseCase {
  constructor(
    private deliveryRepository: IDeliveryRepository,
    private courierRepository: ICourierRepository
  ) { }

  async execute(input: GetDeliveryInput): Promise<GetDeliveryOutput> {
    const delivery = await this.deliveryRepository.findById(input.deliveryId);

    if (!delivery) {
      throw new Error(`Delivery with ID ${input.deliveryId} not found`);
    }

    // Get courier information
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
  }
}
