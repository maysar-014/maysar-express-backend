import { GeoPoint } from '../value-objects/geopoint.value-object';
import { CourierStatus, isCourierAvailable } from '../enums/courier-status.enum';
import { CourierStatusPolicy } from '../policies/courier-status.policy';

export class CourierEntity {
  private static statusPolicy = new CourierStatusPolicy();

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly vehicle: {
      type: string;
      capacity: {
        maxWeight: number;
        maxVolume: number;
        maxItems: number;
      };
    },
    public readonly rating: number,
    public readonly completionRate: number,
    public readonly currentLocation: GeoPoint,
    public readonly status: CourierStatus,
    public readonly estimatedArrivalTime: number | undefined,
    public readonly trafficExperience: number
  ) {}

  static create(data: {
    id: string;
    name: string;
    phone: string;
    vehicle: any;
    rating: number;
    completionRate: number;
    currentLocation: GeoPoint;
    isAvailable?: boolean;
    status?: CourierStatus;
    estimatedArrivalTime?: number;
    trafficExperience: number;
  }): CourierEntity {
    const status = data.status ?? (data.isAvailable ? 'online' : 'offline');
    return new CourierEntity(
      data.id,
      data.name,
      data.phone,
      data.vehicle,
      data.rating,
      data.completionRate,
      data.currentLocation,
      status,
      data.estimatedArrivalTime,
      data.trafficExperience
    );
  }

  get isAvailable(): boolean {
    return isCourierAvailable(this.status);
  }

  transitionTo(status: CourierStatus): CourierEntity {
    CourierEntity.statusPolicy.assertTransition(this.status, status);
    return CourierEntity.create({
      id: this.id,
      name: this.name,
      phone: this.phone,
      vehicle: this.vehicle,
      rating: this.rating,
      completionRate: this.completionRate,
      currentLocation: this.currentLocation,
      status,
      estimatedArrivalTime: this.estimatedArrivalTime,
      trafficExperience: this.trafficExperience
    });
  }

  isEligibleForAssignment(): boolean {
    return this.isAvailable &&
           this.rating >= 4.0 &&
           this.completionRate >= 0.95;
  }

  canHandleWeight(weightKg: number): boolean {
    return this.vehicle.capacity.maxWeight >= weightKg;
  }

  canHandleVolume(volume: number): boolean {
    return this.vehicle.capacity.maxVolume >= volume;
  }

  getDistanceFrom(location: GeoPoint): number {
    return this.currentLocation.distanceTo(location);
  }

  toString(): string {
    return `${this.name} (${this.vehicle.type}) - Rating: ${this.rating}`;
  }
}
