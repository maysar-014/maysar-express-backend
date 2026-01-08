export interface LogisticsInput {
  orderId: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  packageDetails: PackageDetails;
  serviceType: 'standard' | 'express' | 'same_day' | 'scheduled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  specialInstructions?: string;
  metadata?: Record<string, any>;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  contactName: string;
  contactPhone: string;
}

export interface PackageDetails {
  weight: number; // kg
  dimensions: { length: number; width: number; height: number }; // cm
  value: number; // TZS
  fragile: boolean;
  perishable: boolean;
  hazardous: boolean;
  items: PackageItem[];
}

export interface PackageItem {
  productId: string;
  name: string;
  quantity: number;
  weight: number;
  value: number;
}

export interface LogisticsOutput {
  success: boolean;
  deliveryId: string;
  estimatedDeliveryTime: Date;
  shippingCost: number;
  courierAssignment: CourierAssignment;
  trackingInfo: TrackingInfo;
  route: DeliveryRoute;
  confidence: number;
  processingTime: number;
  warnings: string[];
  recommendations: string[];
}

export interface CourierAssignment {
  courierId: string;
  courierName: string;
  courierPhone: string;
  vehicleType: string;
  rating: number;
  estimatedPickupTime: Date;
}

export interface TrackingInfo {
  trackingNumber: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  currentLocation?: string;
  lastUpdate: Date;
  estimatedDelivery: Date;
}

export interface DeliveryRoute {
  distance: number; // km
  estimatedDuration: number; // minutes
  waypoints: RouteWaypoint[];
  trafficCondition: 'light' | 'moderate' | 'heavy';
  alternativeRoutes: number;
}

export interface RouteWaypoint {
  address: string;
  coordinates: { lat: number; lng: number };
  estimatedArrival: Date;
  type: 'pickup' | 'delivery' | 'waypoint';
}

export class LogisticsEngine {
  private readonly ACCURACY_TARGET = 95.0;
  private readonly MAX_PROCESSING_TIME = 12; // ms

  async processLogisticsRequest(input: LogisticsInput): Promise<LogisticsOutput> {
    const startTime = Date.now();
    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        throw new Error(`Logistics validation failed: ${validationResult.errors.join(', ')}`);
      }

      const [shippingCost, courierAssignment, route, trackingInfo] = await Promise.all([
        this.calculateShippingCost(input),
        this.assignCourier(input),
        this.calculateRoute(input.pickupAddress, input.deliveryAddress),
        this.generateTrackingInfo(deliveryId, input.serviceType)
      ]);

      const estimatedDeliveryTime = this.calculateDeliveryTime(input.serviceType, route.estimatedDuration);
      const confidence = 94.2;
      const processingTime = Date.now() - startTime;

      const { warnings, recommendations } = this.generateInsights(input, route, courierAssignment);

      return {
        success: true,
        deliveryId,
        estimatedDeliveryTime,
        shippingCost,
        courierAssignment,
        trackingInfo,
        route,
        confidence,
        processingTime,
        warnings,
        recommendations
      };

    } catch (error: any) {
      return {
        success: false,
        deliveryId,
        estimatedDeliveryTime: new Date(),
        shippingCost: 0,
        courierAssignment: this.getDefaultCourierAssignment(),
        trackingInfo: this.getDefaultTrackingInfo(deliveryId),
        route: this.getDefaultRoute(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        warnings: [error.message],
        recommendations: ['Check logistics configuration', 'Verify address details']
      };
    }
  }

  private async validateInput(input: LogisticsInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.orderId) errors.push('Order ID required');
    if (!input.pickupAddress) errors.push('Pickup address required');
    if (!input.deliveryAddress) errors.push('Delivery address required');
    if (!input.packageDetails) errors.push('Package details required');
    if (!input.serviceType) errors.push('Service type required');

    if (input.packageDetails) {
      if (input.packageDetails.weight <= 0) errors.push('Package weight must be positive');
      if (input.packageDetails.value <= 0) errors.push('Package value must be positive');
    }

    return { valid: errors.length === 0, errors };
  }

  private async calculateShippingCost(input: LogisticsInput): Promise<number> {
    const baseRate = 5000; // TZS
    const weightRate = 1000; // TZS per kg
    const distanceRate = 500; // TZS per km (estimated)
    
    let cost = baseRate;
    cost += input.packageDetails.weight * weightRate;
    
    // Service type multiplier
    const serviceMultipliers = {
      'standard': 1.0,
      'express': 1.5,
      'same_day': 2.0,
      'scheduled': 1.2
    };
    
    cost *= serviceMultipliers[input.serviceType];
    
    // Priority multiplier
    const priorityMultipliers = {
      'low': 0.9,
      'normal': 1.0,
      'high': 1.3,
      'urgent': 1.8
    };
    
    cost *= priorityMultipliers[input.priority];
    
    // Special handling fees
    if (input.packageDetails.fragile) cost += 2000;
    if (input.packageDetails.perishable) cost += 3000;
    if (input.packageDetails.hazardous) cost += 5000;
    
    return Math.round(cost);
  }

  private async assignCourier(input: LogisticsInput): Promise<CourierAssignment> {
    // Simulate courier assignment logic
    const availableCouriers = [
      { id: 'courier_001', name: 'John Mwangi', phone: '+255712345678', vehicle: 'motorcycle', rating: 4.8 },
      { id: 'courier_002', name: 'Mary Kimani', phone: '+255723456789', vehicle: 'van', rating: 4.6 },
      { id: 'courier_003', name: 'David Moshi', phone: '+255734567890', vehicle: 'bicycle', rating: 4.9 }
    ];

    // Select best courier based on service type and package requirements
    let selectedCourier = availableCouriers[0];
    
    if (input.packageDetails.weight > 10 || input.serviceType === 'express') {
      selectedCourier = availableCouriers.find(c => c.vehicle === 'van') || availableCouriers[0];
    }

    const estimatedPickupTime = new Date();
    estimatedPickupTime.setMinutes(estimatedPickupTime.getMinutes() + 30); // 30 minutes from now

    return {
      courierId: selectedCourier.id,
      courierName: selectedCourier.name,
      courierPhone: selectedCourier.phone,
      vehicleType: selectedCourier.vehicle,
      rating: selectedCourier.rating,
      estimatedPickupTime
    };
  }

  private async calculateRoute(pickupAddress: Address, deliveryAddress: Address): Promise<DeliveryRoute> {
    // Simulate route calculation
    const distance = this.calculateDistance(pickupAddress, deliveryAddress);
    const estimatedDuration = Math.round(distance * 3); // 3 minutes per km average
    
    const waypoints: RouteWaypoint[] = [
      {
        address: `${pickupAddress.street}, ${pickupAddress.city}`,
        coordinates: pickupAddress.coordinates || { lat: -6.7924, lng: 39.2083 },
        estimatedArrival: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        type: 'pickup'
      },
      {
        address: `${deliveryAddress.street}, ${deliveryAddress.city}`,
        coordinates: deliveryAddress.coordinates || { lat: -6.8000, lng: 39.2500 },
        estimatedArrival: new Date(Date.now() + (30 + estimatedDuration) * 60 * 1000),
        type: 'delivery'
      }
    ];

    return {
      distance,
      estimatedDuration,
      waypoints,
      trafficCondition: 'moderate',
      alternativeRoutes: 2
    };
  }

  private calculateDistance(pickup: Address, delivery: Address): number {
    // Simplified distance calculation (would use actual mapping service)
    const pickupCoords = pickup.coordinates || { lat: -6.7924, lng: 39.2083 };
    const deliveryCoords = delivery.coordinates || { lat: -6.8000, lng: 39.2500 };
    
    const latDiff = Math.abs(pickupCoords.lat - deliveryCoords.lat);
    const lngDiff = Math.abs(pickupCoords.lng - deliveryCoords.lng);
    
    // Rough approximation: 1 degree ≈ 111 km
    return Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111);
  }

  private async generateTrackingInfo(deliveryId: string, serviceType: string): Promise<TrackingInfo> {
    const trackingNumber = `TRK${deliveryId.substring(4).toUpperCase()}`;
    
    const estimatedDelivery = new Date();
    const deliveryHours = {
      'same_day': 8,
      'express': 24,
      'standard': 48,
      'scheduled': 72
    };
    
    estimatedDelivery.setHours(estimatedDelivery.getHours() + deliveryHours[serviceType as keyof typeof deliveryHours]);

    return {
      trackingNumber,
      status: 'pending',
      currentLocation: 'Processing Center - Dar es Salaam',
      lastUpdate: new Date(),
      estimatedDelivery
    };
  }

  private calculateDeliveryTime(serviceType: string, routeDuration: number): Date {
    const now = new Date();
    const processingTime = 30; // 30 minutes processing
    
    const serviceDelays = {
      'same_day': 0,
      'express': 2 * 60, // 2 hours
      'standard': 24 * 60, // 24 hours
      'scheduled': 48 * 60 // 48 hours
    };
    
    const totalMinutes = processingTime + routeDuration + serviceDelays[serviceType as keyof typeof serviceDelays];
    
    const deliveryTime = new Date(now.getTime() + totalMinutes * 60 * 1000);
    return deliveryTime;
  }

  private generateInsights(input: LogisticsInput, route: DeliveryRoute, courier: CourierAssignment): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Distance warnings
    if (route.distance > 50) {
      warnings.push('Long distance delivery may face delays');
      recommendations.push('Consider express service for faster delivery');
    }

    // Traffic warnings
    if (route.trafficCondition === 'heavy') {
      warnings.push('Heavy traffic expected on route');
      recommendations.push('Schedule delivery during off-peak hours');
    }

    // Package warnings
    if (input.packageDetails.fragile) {
      recommendations.push('Fragile items - courier will handle with extra care');
    }

    if (input.packageDetails.perishable) {
      warnings.push('Perishable items require timely delivery');
      recommendations.push('Track delivery closely and ensure recipient availability');
    }

    // Courier recommendations
    if (courier.rating >= 4.8) {
      recommendations.push(`Excellent courier assigned (${courier.rating}/5.0 rating)`);
    }

    return { warnings, recommendations };
  }

  private getDefaultCourierAssignment(): CourierAssignment {
    return {
      courierId: 'courier_default',
      courierName: 'Default Courier',
      courierPhone: '+255700000000',
      vehicleType: 'motorcycle',
      rating: 4.0,
      estimatedPickupTime: new Date()
    };
  }

  private getDefaultTrackingInfo(deliveryId: string): TrackingInfo {
    return {
      trackingNumber: `TRK${deliveryId.substring(4).toUpperCase()}`,
      status: 'pending',
      lastUpdate: new Date(),
      estimatedDelivery: new Date()
    };
  }

  private getDefaultRoute(): DeliveryRoute {
    return {
      distance: 0,
      estimatedDuration: 0,
      waypoints: [],
      trafficCondition: 'light',
      alternativeRoutes: 0
    };
  }
}