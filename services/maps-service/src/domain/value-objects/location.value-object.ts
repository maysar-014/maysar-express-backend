import { GeoPoint } from './geopoint.value-object';

export interface LocationProps {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export class Location {
  private constructor(private readonly point: GeoPoint) {}

  static create(props: LocationProps): Location {
    if (props.latitude < -90 || props.latitude > 90) {
      throw new Error('Invalid latitude');
    }

    if (props.longitude < -180 || props.longitude > 180) {
      throw new Error('Invalid longitude');
    }

    return new Location(
      GeoPoint.create(
        props.latitude,
        props.longitude,
        props.address || 'Location',
        props.accuracy
      )
    );
  }

  getLatitude(): number {
    return this.point.getLatitude();
  }

  getLongitude(): number {
    return this.point.getLongitude();
  }

  getCoordinates(): { lat: number; lng: number } {
    return this.point.getCoordinates();
  }

  distanceTo(other: Location): number {
    return this.point.distanceTo(other.point);
  }

  equals(other: Location): boolean {
    return this.point.equals(other.point);
  }

  toString(): string {
    return this.point.toString();
  }
}
