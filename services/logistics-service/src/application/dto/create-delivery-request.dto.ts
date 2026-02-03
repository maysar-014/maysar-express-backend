export interface CreateDeliveryRequestDto {
  orderId: string;
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
  weight: number; // in kg
  priority: 'standard' | 'express' | 'urgent';
  timeWindow?: {
    earliest: Date;
    latest: Date;
  };
  specialRequirements?: string[];
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface CreateDeliveryResponseDto {
  success: boolean;
  deliveryId?: string;
  courierId?: string;
  courierName?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  totalCost?: number;
  route?: {
    distance: number;
    duration: number;
    waypoints: Array<{
      lat: number;
      lng: number;
      type: 'pickup' | 'delivery' | 'waypoint';
    }>;
  };
  error?: string;
}
