import { Delivery } from '../entities/delivery.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { TimeWindow } from '../value-objects/time-window.value-object';

export class DeliveryDomainService {
  /**
   * Calculate estimated delivery time based on distance, traffic, and priority
   */
  public calculateEstimatedDeliveryTime(
    pickupLocation: GeoPoint,
    deliveryLocation: GeoPoint,
    priority: 'standard' | 'express' | 'urgent',
    trafficFactor: number = 1.0
  ): Date {
    const distance = pickupLocation.distanceTo(deliveryLocation);
    const baseSpeed = 30; // km/h average speed
    const adjustedSpeed = baseSpeed / trafficFactor;
    
    // Priority multipliers for urgency
    const priorityMultipliers = {
      standard: 1.0,
      express: 0.8,
      urgent: 0.6,
    };

    const travelTimeHours = (distance / adjustedSpeed) * priorityMultipliers[priority];
    const processingTimeHours = this.getProcessingTime(priority);
    
    const totalTimeHours = travelTimeHours + processingTimeHours;
    const estimatedTime = new Date();
    estimatedTime.setHours(estimatedTime.getHours() + totalTimeHours);
    
    return estimatedTime;
  }

  /**
   * Validate delivery constraints and requirements
   */
  public validateDeliveryConstraints(delivery: Delivery): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Validate package dimensions and weight
    if (delivery.packageDetails.weight <= 0) {
      violations.push('Package weight must be greater than 0');
    }

    if (delivery.packageDetails.weight > 500) {
      violations.push('Package weight exceeds maximum limit (500kg)');
    }

    // Validate addresses
    if (!this.isValidAddress(delivery.pickupAddress)) {
      violations.push('Invalid pickup address');
    }

    if (!this.isValidAddress(delivery.deliveryAddress)) {
      violations.push('Invalid delivery address');
    }

    // Validate time window if specified
    if (delivery.timeWindow && !this.isValidTimeWindow(delivery.timeWindow)) {
      violations.push('Invalid delivery time window');
    }

    // Check if pickup and delivery addresses are the same
    if (this.areAddressesEqual(delivery.pickupAddress, delivery.deliveryAddress)) {
      violations.push('Pickup and delivery addresses cannot be the same');
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Calculate delivery cost based on distance, weight, and priority
   */
  public calculateDeliveryCost(
    distance: number,
    weight: number,
    priority: 'standard' | 'express' | 'urgent',
    isRushHour: boolean = false
  ): {
    baseCost: number;
    distanceCost: number;
    weightCost: number;
    priorityCost: number;
    rushHourSurcharge: number;
    totalCost: number;
  } {
    const baseCost = 5.00; // Base delivery fee
    const distanceCost = distance * 0.5; // $0.50 per km
    const weightCost = Math.max(0, (weight - 5) * 0.1); // $0.10 per kg over 5kg
    
    const priorityMultipliers = {
      standard: 1.0,
      express: 1.5,
      urgent: 2.0,
    };
    
    const priorityCost = (baseCost + distanceCost) * (priorityMultipliers[priority] - 1);
    const rushHourSurcharge = isRushHour ? (baseCost + distanceCost + priorityCost) * 0.2 : 0;
    
    const totalCost = baseCost + distanceCost + weightCost + priorityCost + rushHourSurcharge;

    return {
      baseCost,
      distanceCost,
      weightCost,
      priorityCost,
      rushHourSurcharge,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Determine if delivery can be combined with others for efficiency
   */
  public canCombineDeliveries(delivery1: Delivery, delivery2: Delivery): {
    canCombine: boolean;
    reason?: string;
    efficiencyGain?: number;
  } {
    // Check if deliveries are in the same general area
    const pickupDistance = new GeoPoint(
      delivery1.pickupAddress.latitude,
      delivery1.pickupAddress.longitude
    ).distanceTo(new GeoPoint(
      delivery2.pickupAddress.latitude,
      delivery2.pickupAddress.longitude
    ));

    const deliveryDistance = new GeoPoint(
      delivery1.deliveryAddress.latitude,
      delivery1.deliveryAddress.longitude
    ).distanceTo(new GeoPoint(
      delivery2.deliveryAddress.latitude,
      delivery2.deliveryAddress.longitude
    ));

    // Maximum distance for combination (5km)
    const maxCombinationDistance = 5;

    if (pickupDistance > maxCombinationDistance || deliveryDistance > maxCombinationDistance) {
      return {
        canCombine: false,
        reason: 'Deliveries are too far apart to combine efficiently',
      };
    }

    // Check time window compatibility
    if (delivery1.timeWindow && delivery2.timeWindow) {
      if (!this.areTimeWindowsCompatible(delivery1.timeWindow, delivery2.timeWindow)) {
        return {
          canCombine: false,
          reason: 'Time windows are not compatible',
        };
      }
    }

    // Check priority compatibility
    if (delivery1.priority === 'urgent' || delivery2.priority === 'urgent') {
      return {
        canCombine: false,
        reason: 'Urgent deliveries cannot be combined',
      };
    }

    // Calculate efficiency gain
    const individualDistance = this.calculateTotalDistance(delivery1) + this.calculateTotalDistance(delivery2);
    const combinedDistance = this.calculateCombinedDistance(delivery1, delivery2);
    const efficiencyGain = ((individualDistance - combinedDistance) / individualDistance) * 100;

    return {
      canCombine: true,
      efficiencyGain: Math.round(efficiencyGain),
    };
  }

  /**
   * Update delivery status with validation
   */
  public updateDeliveryStatus(
    delivery: Delivery,
    newStatus: string,
    location?: GeoPoint,
    notes?: string
  ): {
    success: boolean;
    error?: string;
    updatedDelivery?: Delivery;
  } {
    const validTransitions = this.getValidStatusTransitions(delivery.status);
    
    if (!validTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${delivery.status} to ${newStatus}`,
      };
    }

    const updatedDelivery = { ...delivery };
    updatedDelivery.status = newStatus;
    updatedDelivery.updatedAt = new Date();

    if (location) {
      updatedDelivery.currentLocation = location;
    }

    if (notes) {
      updatedDelivery.notes = (updatedDelivery.notes || '') + '\n' + notes;
    }

    // Set timestamps for specific statuses
    switch (newStatus) {
      case 'picked_up':
        updatedDelivery.pickedUpAt = new Date();
        break;
      case 'delivered':
        updatedDelivery.actualDeliveryTime = new Date();
        break;
      case 'failed':
        updatedDelivery.failedAt = new Date();
        break;
    }

    return {
      success: true,
      updatedDelivery,
    };
  }

  private getProcessingTime(priority: 'standard' | 'express' | 'urgent'): number {
    const processingTimes = {
      standard: 0.5, // 30 minutes
      express: 0.25, // 15 minutes
      urgent: 0.1, // 6 minutes
    };
    return processingTimes[priority];
  }

  private isValidAddress(address: any): boolean {
    return address &&
           address.street &&
           address.city &&
           address.postalCode &&
           typeof address.latitude === 'number' &&
           typeof address.longitude === 'number' &&
           address.latitude >= -90 && address.latitude <= 90 &&
           address.longitude >= -180 && address.longitude <= 180;
  }

  private isValidTimeWindow(timeWindow: TimeWindow): boolean {
    const start = new Date(timeWindow.startTime);
    const end = new Date(timeWindow.endTime);
    return start < end && start > new Date();
  }

  private areAddressesEqual(addr1: any, addr2: any): boolean {
    return addr1.latitude === addr2.latitude && addr1.longitude === addr2.longitude;
  }

  private areTimeWindowsCompatible(tw1: TimeWindow, tw2: TimeWindow): boolean {
    const start1 = new Date(tw1.startTime);
    const end1 = new Date(tw1.endTime);
    const start2 = new Date(tw2.startTime);
    const end2 = new Date(tw2.endTime);

    // Check if time windows overlap
    return start1 < end2 && start2 < end1;
  }

  private calculateTotalDistance(delivery: Delivery): number {
    return new GeoPoint(
      delivery.pickupAddress.latitude,
      delivery.pickupAddress.longitude
    ).distanceTo(new GeoPoint(
      delivery.deliveryAddress.latitude,
      delivery.deliveryAddress.longitude
    ));
  }

  private calculateCombinedDistance(delivery1: Delivery, delivery2: Delivery): number {
    // Simplified calculation - in reality, this would use route optimization
    const pickup1 = new GeoPoint(delivery1.pickupAddress.latitude, delivery1.pickupAddress.longitude);
    const pickup2 = new GeoPoint(delivery2.pickupAddress.latitude, delivery2.pickupAddress.longitude);
    const delivery1Point = new GeoPoint(delivery1.deliveryAddress.latitude, delivery1.deliveryAddress.longitude);
    const delivery2Point = new GeoPoint(delivery2.deliveryAddress.latitude, delivery2.deliveryAddress.longitude);

    // Assume optimal route: pickup1 -> pickup2 -> delivery1 -> delivery2
    return pickup1.distanceTo(pickup2) + 
           pickup2.distanceTo(delivery1Point) + 
           delivery1Point.distanceTo(delivery2Point);
  }

  private getValidStatusTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'failed'],
      'in_transit': ['delivered', 'failed'],
      'delivered': [], // Terminal state
      'failed': ['assigned'], // Can be reassigned
      'cancelled': [], // Terminal state
    };

    return transitions[currentStatus] || [];
  }
}