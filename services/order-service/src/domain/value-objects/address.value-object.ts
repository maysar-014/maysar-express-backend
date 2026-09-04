export class Address {
  // Named address fields (required)
  public readonly street: string;
  public readonly postalCode: string;
  public readonly country: string;

  // Tanzania geographic hierarchy (optional; preferred over city)
  public readonly ward?: string;      // most precise — e.g. "Kivukoni"
  public readonly district?: string;  // e.g. "Ilala Cbd"
  public readonly region?: string;    // e.g. "Dar es Salaam"

  // Legacy / international field (optional for Tanzania; required for international)
  public readonly city?: string;

  // Geocode coordinates (optional)
  public readonly latitude?: number;
  public readonly longitude?: number;

  constructor(
    street: string,
    city: string | undefined,
    postalCode: string,
    country: string,
    latitude?: number,
    longitude?: number,
    opts?: { ward?: string; district?: string; region?: string }
  ) {
    // Validate required fields
    if (!street || !postalCode || !country) {
      throw new Error('Street, postal code, and country are required for an address');
    }

    this.street = street;
    this.city = city || undefined;
    this.postalCode = postalCode;
    this.country = country;
    this.ward = opts?.ward;
    this.district = opts?.district;
    this.region = opts?.region;

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
    const parts = [
      this.street,
      this.ward,
      this.district,
      this.city,
      this.region,
      this.postalCode,
      this.country,
    ].filter(Boolean);
    const baseAddress = parts.join(', ');
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
      this.ward === other.ward &&
      this.district === other.district &&
      this.region === other.region &&
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
      longitude,
      { ward: fallbackAddress.ward, district: fallbackAddress.district, region: fallbackAddress.region }
    );
  }

  // Create address from named location only
  public static fromNamedAddress(street: string, city: string | undefined, postalCode: string, country: string, opts?: { ward?: string; district?: string; region?: string }): Address {
    return new Address(street, city, postalCode, country, undefined, undefined, opts);
  }
}
