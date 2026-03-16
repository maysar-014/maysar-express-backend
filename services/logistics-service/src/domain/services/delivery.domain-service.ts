import { DeliveryEntity } from '../entities/delivery.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { IDeliveryRepository } from '../repositories';

export class DeliveryDomainService {
  /**
   * Calculate estimated delivery time based on distance and traffic
   */
  public calculateEstimatedDeliveryTime(
    pickupLocation: GeoPoint,
    deliveryLocation: GeoPoint,
    priority: 'standard' | 'express' | 'urgent' = 'standard',
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
  public validateDeliveryConstraints(delivery: DeliveryEntity): {
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
    priority: 'standard' | 'express' | 'urgent' = 'standard',
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
   * Update delivery status with validation
   */
  public updateDeliveryStatus(
    delivery: DeliveryEntity,
    newStatus: string,
    deliveryRepository?: IDeliveryRepository
  ): {
    success: boolean;
    error?: string;
  } {
    const validTransitions = this.getValidStatusTransitions(delivery.status);

    if (!validTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${delivery.status} to ${newStatus}`,
      };
    }

    try {
      switch (newStatus) {
        case 'assigned':
          if (!delivery.courierId) {
            return { success: false, error: 'Courier ID is required to assign delivery' };
          }
          delivery.assignCourier(delivery.courierId);
          break;
        case 'picked_up':
          delivery.markAsPickedUp();
          break;
        case 'in_transit':
          delivery.markAsInTransit();
          break;
        case 'out_for_delivery':
          delivery.markAsOutForDelivery();
          break;
        case 'delivered':
          delivery.markAsDelivered();
          break;
        case 'failed':
          delivery.markAsFailed('status updated to failed');
          break;
        case 'cancelled':
          delivery.cancel('status updated to cancelled');
          break;
        default:
          return { success: false, error: `Unknown delivery status: ${newStatus}` };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }

    if (deliveryRepository) {
      void deliveryRepository.updateStatus(delivery.id, delivery.status, {
        updatedAt: delivery.updatedAt,
        notes: delivery.notes
      });
    }

    return {
      success: true,
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
           address.coordinates &&
           typeof address.coordinates.lat === 'number' &&
           typeof address.coordinates.lng === 'number' &&
           address.coordinates.lat >= -90 && address.coordinates.lat <= 90 &&
           address.coordinates.lng >= -180 && address.coordinates.lng <= 180;
  }

  private areAddressesEqual(addr1: any, addr2: any): boolean {
    return addr1.coordinates.lat === addr2.coordinates.lat &&
           addr1.coordinates.lng === addr2.coordinates.lng;
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
