import { GeoPoint } from '../value-objects/geopoint.value-object';

export class CourierEntity {
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
    public readonly isAvailable: boolean,
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
    isAvailable: boolean;
    trafficExperience: number;
  }): CourierEntity {
    return new CourierEntity(
      data.id,
      data.name,
      data.phone,
      data.vehicle,
      data.rating,
      data.completionRate,
      data.currentLocation,
      data.isAvailable,
      data.trafficExperience
    );
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
