import { CourierEntity } from '../entities/courier.entity';
import { DeliveryEntity } from '../entities/delivery.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { ArrivalTimeCalculationService, EstimatedArrivalResult } from './arrival-time-calculation.service';

export class CourierDomainService {
  constructor(
    private arrivalTimeService?: ArrivalTimeCalculationService
  ) {}

  /**
   * Calculate estimated arrival time for a courier to reach a destination
   */
  public async calculateEstimatedArrivalTime(
    courier: CourierEntity,
    destination: GeoPoint,
    currentTime: Date = new Date()
  ): Promise<EstimatedArrivalResult> {
    if (!this.arrivalTimeService) {
      // Fallback calculation if no arrival time service is available
      const distance = courier.currentLocation.distanceTo(destination);
      const baseSpeed = this.getBaseSpeedForVehicle(courier.vehicle.type);
      const baseTravelTime = Math.ceil((distance / baseSpeed) * 60); // minutes

      return {
        estimatedMinutes: baseTravelTime,
        distanceKm: distance,
        factors: {
          distance,
          trafficMultiplier: 1.0,
          weatherMultiplier: 1.0,
          timeOfDayMultiplier: 1.0
        },
        confidence: 50 // Lower confidence without real-time data
      };
    }

    return this.arrivalTimeService.calculateEstimatedArrivalTime(
      courier.currentLocation,
      destination,
      courier.vehicle.type,
      currentTime
    );
  }

  /**
   * Calculate courier availability based on current workload and capacity
   */
  public calculateAvailability(courier: CourierEntity, activeDeliveries: DeliveryEntity[]): {
    isAvailable: boolean;
    capacity: number;
    currentLoad: number;
    estimatedFreeTime?: Date;
  } {
    const maxCapacity = this.getMaxCapacityForVehicle(courier.vehicle.type);
    const currentLoad = activeDeliveries.length;
    const isAvailable = currentLoad < maxCapacity && courier.isAvailable;

    let estimatedFreeTime: Date | undefined;
    if (!isAvailable && activeDeliveries.length > 0) {
      // Calculate when the courier will be free based on active deliveries
      const latestDelivery = activeDeliveries
        .sort((a, b) => new Date(b.estimatedDeliveryTime || 0).getTime() - new Date(a.estimatedDeliveryTime || 0).getTime())[0];
      estimatedFreeTime = latestDelivery.estimatedDeliveryTime;
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
  public canHandleDelivery(courier: CourierEntity, delivery: DeliveryEntity): {
    canHandle: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let canHandle = true;

    // Check vehicle capacity
    const maxWeight = this.getMaxWeightForVehicle(courier.vehicle.type);
    if (delivery.package.weight > maxWeight) {
      canHandle = false;
      reasons.push(`Package weight (${delivery.package.weight}kg) exceeds vehicle capacity (${maxWeight}kg)`);
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

    return { canHandle, reasons };
  }

  /**
   * Calculate courier efficiency score based on performance metrics
   */
  public calculateEfficiencyScore(courier: CourierEntity, recentDeliveries: DeliveryEntity[]): {
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
      d.actualDeliveryTime && d.estimatedDeliveryTime && 
      new Date(d.actualDeliveryTime) <= new Date(d.estimatedDeliveryTime)
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

  private getBaseSpeedForVehicle(vehicleType: string): number {
    const speeds: Record<string, number> = {
      bicycle: 15,
      motorcycle: 35,
      scooter: 25,
      car: 30,
      van: 25,
      truck: 20
    };
    return speeds[vehicleType.toLowerCase()] || 25; // default to 25 km/h
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

  private isInServiceArea(courier: CourierEntity, address: any): boolean {
    // Simplified implementation - check if address city matches courier's location
    return address.city.toLowerCase().includes(courier.currentLocation.getAddress().toLowerCase());
  }
}
