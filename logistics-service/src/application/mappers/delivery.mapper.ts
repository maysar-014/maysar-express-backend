import { CreateDeliveryRequestDto, CreateDeliveryResponseDto } from '../dto/create-delivery-request.dto';
import { CreateDeliveryInput, CreateDeliveryOutput } from '../use-cases/create-delivery.use-case';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import { TimeWindow } from '../../domain/value-objects/time-window.value-object';

export class DeliveryMapper {
  static toCreateDeliveryInput(dto: CreateDeliveryRequestDto): CreateDeliveryInput {
    return {
      orderId: dto.orderId,
      pickupLocation: {
        lat: dto.pickupLocation.lat,
        lng: dto.pickupLocation.lng,
        address: dto.pickupLocation.address
      },
      deliveryLocation: {
        lat: dto.deliveryLocation.lat,
        lng: dto.deliveryLocation.lng,
        address: dto.deliveryLocation.address
      },
      weight: dto.weight,
      priority: dto.priority,
      timeWindow: dto.timeWindow,
      specialRequirements: dto.specialRequirements
    };
  }

  static toCreateDeliveryResponseDto(output: CreateDeliveryOutput): CreateDeliveryResponseDto {
    return {
      success: true,
      deliveryId: output.deliveryId,
      courierId: output.courierId,
      courierName: output.courierName,
      estimatedPickupTime: output.estimatedPickupTime,
      estimatedDeliveryTime: output.estimatedDeliveryTime,
      totalCost: output.totalCost,
      route: output.route
    };
  }

  static toCreateDeliveryResponseDtoFromError(error: Error): CreateDeliveryResponseDto {
    return {
      success: false,
      error: error.message
    };
  }

  // Utility methods for domain object creation
  static createGeoPoint(lat: number, lng: number, address: string): GeoPoint {
    return GeoPoint.create(lat, lng, address);
  }

  static createWeight(value: number): Weight {
    return Weight.fromKilograms(value);
  }

  static createTimeWindow(earliest: Date, latest: Date): TimeWindow {
    return TimeWindow.create(earliest, latest);
  }

  // Validation helpers
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  static validateWeight(weight: number): boolean {
    return weight > 0 && weight <= 1000; // Max 1000kg
  }

  static validatePriority(priority: string): priority is 'standard' | 'express' | 'urgent' {
    return ['standard', 'express', 'urgent'].includes(priority);
  }
}
