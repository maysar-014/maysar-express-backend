import { ValueObject } from '@domain/interfaces';
import { Address as AddressType } from '@domain/types/user.types';

/**
 * Address Value Object
 * Represents a validated address with geolocation support
 */
export class Address implements ValueObject<AddressType> {
  public readonly value: AddressType;

  constructor(address: AddressType) {
    if (!this.isValidAddress(address)) {
      throw new Error('Invalid address data');
    }

    this.value = address;
  }

  /**
   * Validate address data
   * City is optional for Tanzania addresses — ward/district/region are sufficient.
   * At least one geographic precision field must be present: city OR ward OR district OR region.
   */
  private isValidAddress(address: AddressType): boolean {
    if (!address.street || address.street.trim().length === 0) {
      return false;
    }

    // Accept Tanzania canonical shape (ward/district/region) OR legacy city
    const hasCity = !!(address.city && address.city.trim().length > 0);
    const hasTanzaniaFields = !!(
      (address.ward && address.ward.trim().length > 0) ||
      (address.district && address.district.trim().length > 0) ||
      (address.region && address.region.trim().length > 0)
    );
    if (!hasCity && !hasTanzaniaFields) {
      return false;
    }

    if (!address.postalCode || address.postalCode.trim().length === 0) {
      return false;
    }

    if (!address.country || address.country.trim().length === 0) {
      return false;
    }

    if (!this.isValidAddressType(address.type)) {
      return false;
    }

    if (address.coordinates) {
      if (!this.isValidCoordinates(address.coordinates)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate address type
   */
  private isValidAddressType(type: string): boolean {
    const validTypes = ['billing', 'shipping', 'business', 'home'];
    return validTypes.includes(type);
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(coordinates: { latitude: number; longitude: number }): boolean {
    const { latitude, longitude } = coordinates;
    
    // Latitude must be between -90 and 90
    if (latitude < -90 || latitude > 90) {
      return false;
    }

    // Longitude must be between -180 and 180
    if (longitude < -180 || longitude > 180) {
      return false;
    }

    return true;
  }

  /**
   * Get address ID
   */
  getId(): string {
    return this.value.id;
  }

  /**
   * Check if value object is valid
   */
  isValid(): boolean {
    return this.isValidAddress(this.value);
  }

  /**
   * Check equality with another address
   */
  equals(other: ValueObject<AddressType>): boolean {
    if (!(other instanceof Address)) {
      return false;
    }
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  /**
   * Get string representation
   */
  toString(): string {
    const parts = [
      this.value.street || '',
      this.value.city || '',
      this.value.state || '',
      this.value.postalCode || '',
      this.value.country || ''
    ].filter(part => part && part.trim().length > 0);

    return parts.join(', ');
  }

  /**
   * Get full address with coordinates if available
   */
  toFullString(): string {
    let addressString = this.toString();
    
    if (this.value.coordinates) {
      addressString += ` (Lat: ${this.value.coordinates.latitude}, Lng: ${this.value.coordinates.longitude})`;
    }

    return addressString;
  }

  /**
   * Check if address is in Tanzania
   */
  isTanzanian(): boolean {
    return this.value.country.toLowerCase() === 'tanzania' || 
           this.value.country.toLowerCase() === 'tz';
  }

  /**
   * Get distance to another address (if coordinates available)
   */
  getDistanceTo(other: Address): number | null {
    if (!this.value.coordinates || !other.value.coordinates) {
      return null;
    }

    return this.calculateDistance(
      this.value.coordinates.latitude,
      this.value.coordinates.longitude,
      other.value.coordinates.latitude,
      other.value.coordinates.longitude
    );
  }

  /**
   * Calculate great-circle distance between two coordinates
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusKm = 6371;
    const lat1Rad = this.deg2rad(lat1);
    const lat2Rad = this.deg2rad(lat2);
    const deltaLon = this.deg2rad(lon2 - lon1);

    const cosineCentralAngle =
      Math.sin(lat1Rad) * Math.sin(lat2Rad) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);
    const normalized = Math.min(1, Math.max(-1, cosineCentralAngle));

    return earthRadiusKm * Math.acos(normalized);
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if address is primary
   */
  isPrimary(): boolean {
    return this.value.isPrimary;
  }

  /**
   * Get address type
   */
  getType(): string {
    return this.value.type;
  }

  /**
   * Create address from data
   */
  static create(data: AddressType): Address {
    return new Address(data);
  }

  /**
   * Create business address
   */
  static createBusiness(data: Omit<AddressType, 'type'>): Address {
    return new Address({ 
      ...data, 
      type: 'business',
      state: data.state || '',
      coordinates: data.coordinates || { latitude: 0, longitude: 0 }
    });
  }

  /**
   * Create home address
   */
  static createHome(data: Omit<AddressType, 'type'>): Address {
    return new Address({ 
      ...data, 
      type: 'home',
      state: data.state || '',
      coordinates: data.coordinates || { latitude: 0, longitude: 0 }
    });
  }

  /**
   * Create billing address
   */
  static createBilling(data: Omit<AddressType, 'type'>): Address {
    return new Address({ 
      ...data, 
      type: 'billing',
      state: data.state || '',
      coordinates: data.coordinates || { latitude: 0, longitude: 0 }
    });
  }

  /**
   * Create shipping address
   */
  static createShipping(data: Omit<AddressType, 'type'>): Address {
    return new Address({ 
      ...data, 
      type: 'shipping',
      state: data.state || '',
      coordinates: data.coordinates || { latitude: 0, longitude: 0 }
    });
  }

  /**
   * Parse address from string (basic implementation)
   */
  static fromString(addressString: string): Address {
    // Basic parsing - in a real implementation, you might use a geocoding service
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length < 3) {
      throw new Error('Address string must contain at least street, city, and country');
    }

    const street = parts[0] || '';
    const city = parts[1] || '';
    const country = parts[parts.length - 1] || '';
    const state = parts.length > 3 ? parts[2] || '' : '';
    const postalCode = parts.length > 4 ? parts[3] || '00000' : '00000';

    return new Address({
      id: '',
      userId: '',
      type: 'shipping',
      isPrimary: false,
      street,
      city,
      state,
      postalCode,
      country,
      coordinates: { latitude: 0, longitude: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}
