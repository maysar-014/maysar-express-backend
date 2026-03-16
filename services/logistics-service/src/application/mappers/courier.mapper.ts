import { CourierEntity } from '../../domain/entities/courier.entity';
import { CourierStatus } from '../../domain/enums/courier-status.enum';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class CourierMapper {
  static toCourierEntity(courier: {
    id: string;
    name: string;
    phone: string;
    vehicle: {
      type: string;
      capacity: {
        maxWeight: number;
        maxVolume: number;
        maxItems: number;
      };
    };
    rating: number;
    completionRate: number;
    currentLocation: GeoPoint;
    status?: CourierStatus;
    isAvailable?: boolean;
    trafficExperience: number;
    estimatedArrivalTime?: number;
  }): CourierEntity {
    return CourierEntity.create({
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      vehicle: courier.vehicle,
      rating: courier.rating,
      completionRate: courier.completionRate,
      currentLocation: courier.currentLocation,
      status: courier.status,
      isAvailable: courier.isAvailable,
      estimatedArrivalTime: courier.estimatedArrivalTime,
      trafficExperience: courier.trafficExperience
    });
  }
}
