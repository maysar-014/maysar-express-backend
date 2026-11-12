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
export type FulfillmentCapability = 'pickup' | 'delivery' | 'shipping';

/** Tanzania mobile/landline accepted formats: +255…, 0…, 255… */
const TANZANIA_PHONE_RE = /^(?:\+?255|0)\s?\d[\d\s-]{7,11}$/;

export interface SellerLocationAddress {
  street?: string;
  ward?: string;
  district?: string;
  region: string;
  postalCode?: string;
  country: string;
  // Stable references to frontend-provided geographic entities
  countryId?: string;
  regionId?: string;
  districtId?: string;
  wardId?: string;
  streetId?: string;
  // Manual locality / practical directions fallback when official street data is unavailable
  locality?: string;
  directions?: string;
}

export interface SellerLocationProps {
  id: string;
  sellerId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  address: SellerLocationAddress;
  fulfillmentCapabilities: FulfillmentCapability[];
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  isActive: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  locationCode?: string;
  contactName?: string;
  contactPhone?: string;
  staffCount?: number;
  deliveryCoverageRadiusKm?: number;
}

export class SellerLocation {
  readonly id: string;
  readonly sellerId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  address: SellerLocationAddress;
  fulfillmentCapabilities: FulfillmentCapability[];
  readonly latitude: number;
  readonly longitude: number;
  isPrimary: boolean;
  isActive: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  readonly createdAt: Date;
  updatedAt: Date;
  locationCode?: string;
  contactName?: string;
  contactPhone?: string;
  staffCount?: number;
  deliveryCoverageRadiusKm?: number;

  constructor(props: SellerLocationProps) {
    if (!props.id) throw new Error('SellerLocation id is required');
    if (!props.sellerId) throw new Error('SellerLocation sellerId is required');
    if (!props.name?.trim()) throw new Error('SellerLocation name is required');
    if (props.latitude < -90 || props.latitude > 90) throw new Error('Invalid latitude');
    if (props.longitude < -180 || props.longitude > 180) throw new Error('Invalid longitude');
    if (!props.address.street?.trim() && !props.address.locality?.trim() && !props.address.directions?.trim()) {
      throw new Error('Street, locality, or directions is required');
    }
    if (!props.address.region?.trim()) throw new Error('Region is required');
    if (!props.address.country?.trim()) throw new Error('Country is required');

    if (props.contactPhone !== undefined && !TANZANIA_PHONE_RE.test(props.contactPhone.trim())) {
      throw new Error('Invalid contact phone format');
    }
    if (props.staffCount !== undefined && (props.staffCount < 0 || !Number.isInteger(props.staffCount))) {
      throw new Error('staffCount must be a non-negative integer');
    }

    this.id = props.id;
    this.sellerId = props.sellerId;
    this.name = props.name.trim();
    this.type = props.type;
    this.status = props.status;
    this.address = props.address;
    this.fulfillmentCapabilities = props.fulfillmentCapabilities ?? [];
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.isPrimary = props.isPrimary;
    this.isActive = props.isActive;
    this.operatingHours = props.operatingHours;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.locationCode = props.locationCode;
    this.contactName = props.contactName?.trim() ? props.contactName.trim() : undefined;
    this.contactPhone = props.contactPhone?.trim() ? props.contactPhone.trim() : undefined;
    this.staffCount = props.staffCount;
    this.deliveryCoverageRadiusKm = props.deliveryCoverageRadiusKm;
  }

  /** Human-readable pickup address string for courier display */
  get displayAddress(): string {
    const { street, ward, district, region, country, locality, directions } = this.address;
    const parts = [street ?? locality ?? directions, ward, district, region, country].filter(Boolean);
    return parts.join(', ');
  }

  /** Supports a given fulfillment method at this location */
  supportsFulfillment(method: FulfillmentCapability): boolean {
    return this.fulfillmentCapabilities.includes(method);
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
}
