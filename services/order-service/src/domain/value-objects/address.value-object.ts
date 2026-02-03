export class Address {
  // Named address fields (required)
  public readonly street: string;
  public readonly city: string;
  public readonly postalCode: string;
  public readonly country: string;

  // Geocode coordinates (optional)
  public readonly latitude?: number;
  public readonly longitude?: number;

  constructor(
    street: string,
    city: string,
    postalCode: string,
    country: string,
    latitude?: number,
    longitude?: number
  ) {
    // Validate named address (required)
    if (!street || !city || !postalCode || !country) {
      throw new Error('Street, city, postal code, and country are required for named address');
    }

    this.street = street;
    this.city = city;
    this.postalCode = postalCode;
    this.country = country;

    // Validate geocode coordinates (optional but must be valid if provided)
    if ((latitude !== undefined && longitude === undefined) ||
        (latitude === undefined && longitude !== undefined)) {
      throw new Error('Both latitude and longitude must be provided together');
    }

    if (latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
    }

    if (longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }
    }

    this.latitude = latitude;
    this.longitude = longitude;
  }

  public hasGeocode(): boolean {
    return this.latitude !== undefined && this.longitude !== undefined;
  }

  public toString(): string {
    const baseAddress = `${this.street}, ${this.city}, ${this.postalCode}, ${this.country}`;
    if (this.hasGeocode()) {
      return `${baseAddress} (${this.latitude}°, ${this.longitude}°)`;
    }
    return baseAddress;
  }

  public toGeocodeString(): string | null {
    if (this.hasGeocode()) {
      return `${this.latitude},${this.longitude}`;
    }
    return null;
  }

  public equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.postalCode === other.postalCode &&
      this.country === other.country &&
      this.latitude === other.latitude &&
      this.longitude === other.longitude
    );
  }

  // Create address from geocode coordinates (reverse geocoding would be needed)
  public static fromGeocode(latitude: number, longitude: number, fallbackAddress: Address): Address {
    return new Address(
      fallbackAddress.street,
      fallbackAddress.city,
      fallbackAddress.postalCode,
      fallbackAddress.country,
      latitude,
      longitude
    );
  }

  // Create address from named location only
  public static fromNamedAddress(street: string, city: string, postalCode: string, country: string): Address {
    return new Address(street, city, postalCode, country);
  }
}
