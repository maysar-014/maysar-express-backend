/**
 * SellerLocation Entity
 *
 * Represents a physical seller-owned location: a shop, warehouse, or pickup point.
 * Each location carries accurate geocoordinates used by the delivery engine as
 * the actual pickup point for courier routing.
 *
 * Invariants:
 *  - sellerId is immutable once set
 *  - latitude and longitude must be valid WGS-84 values
 *  - exactly one location per seller may be isPrimary=true
 */

export type LocationType = 'SHOP' | 'WAREHOUSE' | 'PICKUP_POINT' | 'HOME_BASED' | 'DISTRIBUTION_CENTER';
export type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface SellerLocationAddress {
  street: string;
  ward?: string;
  district?: string;
  region: string;
  postalCode?: string;
  country: string;
}

export interface SellerLocationProps {
  id: string;
  sellerId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  address: SellerLocationAddress;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  isActive: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SellerLocation {
  readonly id: string;
  readonly sellerId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  address: SellerLocationAddress;
  readonly latitude: number;
  readonly longitude: number;
  isPrimary: boolean;
  isActive: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: SellerLocationProps) {
    if (!props.id) throw new Error('SellerLocation id is required');
    if (!props.sellerId) throw new Error('SellerLocation sellerId is required');
    if (!props.name?.trim()) throw new Error('SellerLocation name is required');
    if (props.latitude < -90 || props.latitude > 90) throw new Error('Invalid latitude');
    if (props.longitude < -180 || props.longitude > 180) throw new Error('Invalid longitude');
    if (!props.address.street?.trim()) throw new Error('Street is required');
    if (!props.address.region?.trim()) throw new Error('Region is required');
    if (!props.address.country?.trim()) throw new Error('Country is required');

    this.id = props.id;
    this.sellerId = props.sellerId;
    this.name = props.name.trim();
    this.type = props.type;
    this.status = props.status;
    this.address = props.address;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.isPrimary = props.isPrimary;
    this.isActive = props.isActive;
    this.operatingHours = props.operatingHours;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  activate(): void {
    this.status = 'ACTIVE';
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = 'INACTIVE';
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /** Human-readable pickup address string for courier display */
  get displayAddress(): string {
    const { street, ward, district, region, country } = this.address;
    return [street, ward, district, region, country].filter(Boolean).join(', ');
  }
}
