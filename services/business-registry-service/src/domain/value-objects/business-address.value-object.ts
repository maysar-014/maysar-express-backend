/**
 * BusinessAddress value object - Business-specific address validation
 */

export interface BusinessAddressProps {
  id: string;
  type: 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER';
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  isPrimary: boolean;
}

export class BusinessAddress {
  private constructor(
    private readonly _id: string,
    private readonly _type: string,
    private readonly _street: string,
    private readonly _city: string,
    private readonly _region: string,
    private readonly _postalCode: string | undefined,
    private readonly _country: string,
    private readonly _isPrimary: boolean
  ) {}

  static create(props: BusinessAddressProps): BusinessAddress {
    if (!props.street || props.street.trim().length === 0) {
      throw new Error('Street is required');
    }
    if (!props.city || props.city.trim().length === 0) {
      throw new Error('City is required');
    }
    if (!props.region || props.region.trim().length === 0) {
      throw new Error('Region is required');
    }
    if (!props.country || props.country.trim().length === 0) {
      throw new Error('Country is required');
    }
    return new BusinessAddress(
      props.id,
      props.type,
      props.street.trim(),
      props.city.trim(),
      props.region.trim(),
      props.postalCode?.trim(),
      props.country.trim(),
      props.isPrimary ?? false
    );
  }

  getId(): string {
    return this._id;
  }

  getType(): string {
    return this._type;
  }

  getStreet(): string {
    return this._street;
  }

  getCity(): string {
    return this._city;
  }

  getRegion(): string {
    return this._region;
  }

  getPostalCode(): string | undefined {
    return this._postalCode;
  }

  getCountry(): string {
    return this._country;
  }

  get isPrimary(): boolean {
    return this._isPrimary;
  }

  isTanzanian(): boolean {
    return this._country.toLowerCase() === 'tanzania' || this._country.toLowerCase() === 'tz';
  }

  equals(other: BusinessAddress): boolean {
    return this._id === other._id;
  }

  isValid(): boolean {
    return !!(this._street && this._city && this._region && this._country);
  }

  toString(): string {
    return `${this._street}, ${this._city}, ${this._region}, ${this._country}`;
  }
}
