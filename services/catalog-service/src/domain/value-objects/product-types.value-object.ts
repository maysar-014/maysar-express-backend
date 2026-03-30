/**
 * Product Type Value Objects
 * Domain-specific types for catalog products
 */

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended'
}

export enum ProductVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SELLER_ONLY = 'seller_only',
  B2B_ONLY = 'b2b_only'
}

export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
  REFURBISHED = 'refurbished',
  DAMAGED = 'damaged'
}

export enum ProductType {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SERVICE = 'service',
  SUBSCRIPTION = 'subscription'
}

export enum InventoryTracking {
  NONE = 'none',
  SIMPLE = 'simple',
  VARIANT = 'variant',
  SKU = 'sku'
}

export class ProductStatusValue {
  constructor(private readonly status: ProductStatus) {}

  static fromString(status: string): ProductStatusValue {
    const normalizedStatus = status.trim().toLowerCase();

    if (!Object.values(ProductStatus).includes(normalizedStatus as ProductStatus)) {
      throw new Error(`Invalid product status: ${status}`);
    }
    return new ProductStatusValue(normalizedStatus as ProductStatus);
  }

  toString(): ProductStatus {
    return this.status;
  }

  canTransitionTo(newStatus: ProductStatus): boolean {
    const transitions: Record<ProductStatus, ProductStatus[]> = {
      [ProductStatus.DRAFT]: [ProductStatus.PENDING_REVIEW, ProductStatus.ARCHIVED],
      [ProductStatus.PENDING_REVIEW]: [ProductStatus.PUBLISHED, ProductStatus.DRAFT, ProductStatus.ARCHIVED],
      [ProductStatus.PUBLISHED]: [ProductStatus.SUSPENDED, ProductStatus.ARCHIVED],
      [ProductStatus.SUSPENDED]: [ProductStatus.PUBLISHED, ProductStatus.ARCHIVED],
      [ProductStatus.ARCHIVED]: [] // Terminal state
    };

    return transitions[this.status]?.includes(newStatus) ?? false;
  }

  isPublished(): boolean {
    return this.status === ProductStatus.PUBLISHED;
  }

  isActive(): boolean {
    return [ProductStatus.PUBLISHED, ProductStatus.PENDING_REVIEW].includes(this.status);
  }
}

export class Dimensions {
  constructor(
    private readonly length: number,
    private readonly width: number,
    private readonly height: number,
    private readonly unit: string = 'cm'
  ) {
    if (length <= 0 || width <= 0 || height <= 0) {
      throw new Error('Dimensions must be positive values');
    }
    if (!['cm', 'in', 'mm'].includes(unit)) {
      throw new Error('Unit must be cm, in, or mm');
    }
  }

  getLength(): number {
    return this.length;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getUnit(): string {
    return this.unit;
  }

  getVolume(): number {
    const volume = this.length * this.width * this.height;
    return Math.round(volume * 1000000) / 1000000;
  }

  convertTo(unit: string): Dimensions {
    if (unit === this.unit) {
      return this;
    }

    // Simple conversion factors (for demonstration)
    const conversions: Record<string, Record<string, number>> = {
      cm: { in: 0.393701, mm: 10 },
      in: { cm: 2.54, mm: 25.4 },
      mm: { cm: 0.1, in: 0.0393701 }
    };

    const factor = conversions[this.unit]?.[unit];
    if (!factor) {
      throw new Error(`Cannot convert from ${this.unit} to ${unit}`);
    }

    return new Dimensions(
      this.length * factor,
      this.width * factor,
      this.height * factor,
      unit
    );
  }

  toString(): string {
    return `${this.length}x${this.width}x${this.height} ${this.unit}`;
  }
}

export class Weight {
  constructor(
    private readonly value: number,
    private readonly unit: string = 'kg'
  ) {
    if (value <= 0) {
      throw new Error('Weight must be positive');
    }
    if (!['kg', 'g', 'lb', 'oz'].includes(unit)) {
      throw new Error('Unit must be kg, g, lb, or oz');
    }
  }

  getValue(): number {
    return this.value;
  }

  getUnit(): string {
    return this.unit;
  }

  convertTo(unit: string): Weight {
    if (unit === this.unit) {
      return this;
    }

    // Conversion factors to base unit (kg)
    const toKg: Record<string, number> = {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495
    };

    const fromKg: Record<string, number> = {
      kg: 1,
      g: 1000,
      lb: 2.20462,
      oz: 35.274
    };

    const valueInKg = this.value * toKg[this.unit];
    const convertedValue = valueInKg * fromKg[unit];

    return new Weight(convertedValue, unit);
  }

  isLessThan(other: Weight): boolean {
    if (this.unit !== other.unit) {
      const otherInThisUnit = other.convertTo(this.unit);
      return this.value < otherInThisUnit.value;
    }
    return this.value < other.value;
  }

  toString(): string {
    return `${this.value} ${this.unit}`;
  }
}

export class SEOData {
  constructor(
    private readonly title?: string,
    private readonly description?: string,
    private readonly keywords?: string[],
    private readonly slug?: string,
    private readonly metaTags?: Record<string, string>
  ) {
    if (title && title.length > 60) {
      throw new Error('SEO title must be 60 characters or less');
    }
    if (description && description.length > 160) {
      throw new Error('SEO description must be 160 characters or less');
    }
    if (slug && !/^[a-z0-9_-]+$/.test(slug)) {
      throw new Error('SEO slug must contain only lowercase letters, numbers, hyphens, and underscores');
    }
  }

  getTitle(): string | undefined {
    return this.title;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getKeywords(): string[] | undefined {
    return this.keywords ? [...this.keywords] : undefined;
  }

  getSlug(): string | undefined {
    return this.slug;
  }

  getMetaTags(): Record<string, string> | undefined {
    return this.metaTags ? { ...this.metaTags } : undefined;
  }

  isComplete(): boolean {
    return !!(this.title && this.description && this.slug);
  }
}

export class ShippingInfo {
  constructor(
    private readonly weight: Weight,
    private readonly dimensions: Dimensions,
    private readonly requiresSpecialHandlingFlag: boolean = false,
    private readonly hazardous: boolean = false,
    private readonly fragile: boolean = false
  ) {}

  getWeight(): Weight {
    return this.weight;
  }

  getDimensions(): Dimensions {
    return this.dimensions;
  }

  requiresSpecialHandling(): boolean {
    return this.requiresSpecialHandlingFlag;
  }

  isHazardous(): boolean {
    return this.hazardous;
  }

  isFragile(): boolean {
    return this.fragile;
  }

  needsSpecialShipping(): boolean {
    return this.requiresSpecialHandlingFlag || this.hazardous || this.fragile;
  }

  getVolumeWeight(): Weight {
    // Volume weight calculation (simplified)
    const volumeInCubicCm = this.dimensions.getVolume();
    const volumeWeightInKg = volumeInCubicCm / 5000; // Standard volumetric divisor
    return new Weight(volumeWeightInKg, 'kg');
  }

  getBillableWeight(): Weight {
    const actualWeight = this.weight.convertTo('kg');
    const volumetricWeight = this.getVolumeWeight();

    // Use the higher of actual vs volumetric weight
    return actualWeight.getValue() > volumetricWeight.getValue()
      ? actualWeight
      : volumetricWeight;
  }
}
