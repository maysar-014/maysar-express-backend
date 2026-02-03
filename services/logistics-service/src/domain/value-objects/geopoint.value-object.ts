export class GeoPoint {
  private constructor(
    private readonly latitude: number,
    private readonly longitude: number,
    private readonly address: string,
    private readonly accuracy?: number
  ) {
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
    if (!address || address.trim().length === 0) {
      throw new Error('Address cannot be empty');
    }
    if (accuracy !== undefined && accuracy < 0) {
      throw new Error('Accuracy cannot be negative');
    }
  }

  static create(latitude: number, longitude: number, address: string, accuracy?: number): GeoPoint {
    return new GeoPoint(latitude, longitude, address, accuracy);
  }

  static fromCoordinates(lat: number, lng: number, address: string): GeoPoint {
    return new GeoPoint(lat, lng, address);
  }

  getLatitude(): number {
    return this.latitude;
  }

  getLongitude(): number {
    return this.longitude;
  }

  getAddress(): string {
    return this.address;
  }

  getAccuracy(): number | undefined {
    return this.accuracy;
  }

  getCoordinates(): { lat: number; lng: number } {
    return { lat: this.latitude, lng: this.longitude };
  }

  // Haversine formula for calculating distance between two points
  distanceTo(other: GeoPoint): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLng = this.toRadians(other.longitude - this.longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(this.latitude)) * Math.cos(this.toRadians(other.latitude)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Check if point is within radius of another point
  isWithinRadius(other: GeoPoint, radiusKm: number): boolean {
    return this.distanceTo(other) <= radiusKm;
  }

  // Calculate bearing from this point to another
  bearingTo(other: GeoPoint): number {
    const dLng = this.toRadians(other.longitude - this.longitude);
    const lat1 = this.toRadians(this.latitude);
    const lat2 = this.toRadians(other.latitude);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  equals(other: GeoPoint): boolean {
    return Math.abs(this.latitude - other.latitude) < 0.000001 &&
           Math.abs(this.longitude - other.longitude) < 0.000001 &&
           this.address === other.address;
  }

  toString(): string {
    return `${this.latitude.toFixed(6)},${this.longitude.toFixed(6)} (${this.address})`;
  }

  toJSON(): object {
    return {
      lat: this.latitude,
      lng: this.longitude,
      address: this.address,
      accuracy: this.accuracy
    };
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
