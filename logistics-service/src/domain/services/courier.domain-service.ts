import { Courier } from '../entities/courier.entity';
import { Delivery } from '../entities/delivery.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';

export class CourierDomainService {
  /**
   * Calculate courier availability based on current workload and capacity
   */
  public calculateAvailability(courier: Courier, activeDeliveries: Delivery[]): {
    isAvailable: boolean;
    capacity: number;
    currentLoad: number;
    estimatedFreeTime?: Date;
  } {
    const maxCapacity = this.getMaxCapacityForVehicle(courier.vehicleType);
    const currentLoad = activeDeliveries.length;
    const isAvailable = currentLoad < maxCapacity && courier.isActive;

    let estimatedFreeTime: Date | undefined;
    if (!isAvailable && activeDeliveries.length > 0) {
      // Calculate when the courier will be free based on active deliveries
      const latestDelivery = activeDeliveries
        .sort((a, b) => new Date(b.estimatedDeliveryTime).getTime() - new Date(a.estimatedDeliveryTime).getTime())[0];
      estimatedFreeTime = new Date(latestDelivery.estimatedDeliveryTime);
    }

    return {
      isAvailable,
      capacity: maxCapacity,
      currentLoad,
      estimatedFreeTime,
    };
  }

  /**
   * Calculate distance between courier and pickup location
   */
  public calculateDistanceToPickup(courierLocation: GeoPoint, pickupLocation: GeoPoint): number {
    return courierLocation.distanceTo(pickupLocation);
  }

  /**
   * Determine if courier can handle the delivery based on vehicle type and package requirements
   */
  public canHandleDelivery(courier: Courier, delivery: Delivery): {
    canHandle: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let canHandle = true;

    // Check vehicle capacity
    const maxWeight = this.getMaxWeightForVehicle(courier.vehicleType);
    if (delivery.packageDetails.weight > maxWeight) {
      canHandle = false;
      reasons.push(`Package weight (${delivery.packageDetails.weight}kg) exceeds vehicle capacity (${maxWeight}kg)`);
    }

    // Check service area
    if (!this.isInServiceArea(courier, delivery.pickupAddress)) {
      canHandle = false;
      reasons.push('Pickup location is outside courier service area');
    }

    if (!this.isInServiceArea(courier, delivery.deliveryAddress)) {
      canHandle = false;
      reasons.push('Delivery location is outside courier service area');
    }

    // Check working hours
    if (!this.isWithinWorkingHours(courier, new Date())) {
      canHandle = false;
      reasons.push('Delivery time is outside courier working hours');
    }

    return { canHandle, reasons };
  }

  /**
   * Calculate courier efficiency score based on performance metrics
   */
  public calculateEfficiencyScore(courier: Courier, recentDeliveries: Delivery[]): {
    score: number;
    metrics: {
      onTimeRate: number;
      averageDeliveryTime: number;
      customerRating: number;
      completionRate: number;
    };
  } {
    if (recentDeliveries.length === 0) {
      return {
        score: 0,
        metrics: {
          onTimeRate: 0,
          averageDeliveryTime: 0,
          customerRating: 0,
          completionRate: 0,
        },
      };
    }

    const completedDeliveries = recentDeliveries.filter(d => d.status === 'delivered');
    const onTimeDeliveries = completedDeliveries.filter(d => 
      new Date(d.actualDeliveryTime!) <= new Date(d.estimatedDeliveryTime)
    );

    const onTimeRate = (onTimeDeliveries.length / completedDeliveries.length) * 100;
    const completionRate = (completedDeliveries.length / recentDeliveries.length) * 100;
    
    const averageDeliveryTime = completedDeliveries.reduce((sum, delivery) => {
      const start = new Date(delivery.createdAt).getTime();
      const end = new Date(delivery.actualDeliveryTime!).getTime();
      return sum + (end - start);
    }, 0) / completedDeliveries.length / (1000 * 60); // Convert to minutes

    const customerRating = courier.rating || 0;

    // Calculate weighted score
    const score = (
      (onTimeRate * 0.3) +
      (completionRate * 0.25) +
      (customerRating * 20 * 0.25) + // Convert 5-star to 100-point scale
      (Math.max(0, 100 - (averageDeliveryTime / 60)) * 0.2) // Efficiency based on delivery time
    );

    return {
      score: Math.round(score),
      metrics: {
        onTimeRate,
        averageDeliveryTime,
        customerRating,
        completionRate,
      },
    };
  }

  private getMaxCapacityForVehicle(vehicleType: string): number {
    const capacities: Record<string, number> = {
      bicycle: 2,
      motorcycle: 5,
      car: 8,
      van: 15,
    };
    return capacities[vehicleType] || 5;
  }

  private getMaxWeightForVehicle(vehicleType: string): number {
    const weights: Record<string, number> = {
      bicycle: 10,
      motorcycle: 25,
      car: 50,
      van: 200,
    };
    return weights[vehicleType] || 25;
  }

  private isInServiceArea(courier: Courier, address: any): boolean {
    // Simplified implementation - in reality, this would check against courier's service area polygons
    return courier.serviceArea.some(area => 
      area.city.toLowerCase() === address.city.toLowerCase()
    );
  }

  private isWithinWorkingHours(courier: Courier, time: Date): boolean {
    const hour = time.getHours();
    const day = time.getDay(); // 0 = Sunday, 6 = Saturday
    
    const workingHours = courier.workingHours[day];
    if (!workingHours || !workingHours.isWorking) {
      return false;
    }

    return hour >= workingHours.startHour && hour < workingHours.endHour;
  }
}