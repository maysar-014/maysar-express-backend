// @ts-nocheck
/**
 * Order Snapshot Value Objects
 * ENH-008: Preserves what the customer actually purchased at order time.
 *
 * Constitution §37:
 * "An order must preserve what the customer actually purchased."
 * "Historical orders must remain interpretable even when catalog information changes."
 * "Never reconstruct an old order solely from the current product or variant record."
 */

// ── Configuration Snapshot ──────────────────────────────────────────────────

export interface ConfigurationSnapshotData {
  /** The product's system ID at the time of purchase */
  productId: string;
  /** Product display name at the time of purchase */
  productName: string;
  /** Product image URL at the time of purchase (primary/thumbnail) */
  productImage: string | null;
  /** Variant ID at the time of purchase, if applicable */
  variantId: string | null;
  /** Selected configuration as a map of dimensionId → option display values */
  selectedConfiguration: Record<string, string> | null;
  /** Configuration definition version at the time of purchase */
  configurationDefinitionVersion: number | null;
  /** Configuration fingerprint at the time of purchase */
  configurationFingerprint: string | null;
}

/**
 * Immutable snapshot of the product configuration a customer purchased.
 * This is frozen at order creation time and never changes.
 */
export class ConfigurationSnapshot {
  public readonly productId: string;
  public readonly productName: string;
  public readonly productImage: string | null;
  public readonly variantId: string | null;
  public readonly selectedConfiguration: Record<string, string> | null;
  public readonly configurationDefinitionVersion: number | null;
  public readonly configurationFingerprint: string | null;

  constructor(data: ConfigurationSnapshotData) {
    this.productId = data.productId;
    this.productName = data.productName;
    this.productImage = data.productImage;
    this.variantId = data.variantId;
    this.selectedConfiguration = data.selectedConfiguration
      ? Object.freeze({ ...data.selectedConfiguration })
      : null;
    this.configurationDefinitionVersion = data.configurationDefinitionVersion;
    this.configurationFingerprint = data.configurationFingerprint;
    Object.freeze(this);
  }

  toJSON(): ConfigurationSnapshotData {
    return {
      productId: this.productId,
      productName: this.productName,
      productImage: this.productImage,
      variantId: this.variantId,
      selectedConfiguration: this.selectedConfiguration,
      configurationDefinitionVersion: this.configurationDefinitionVersion,
      configurationFingerprint: this.configurationFingerprint,
    };
  }

  static fromJSON(data: ConfigurationSnapshotData): ConfigurationSnapshot {
    return new ConfigurationSnapshot(data);
  }

  /**
   * Returns true if this snapshot is for a simple product (no configuration).
   */
  isSimpleProduct(): boolean {
    return this.selectedConfiguration === null && this.variantId === null;
  }
}

// ── Price Snapshot ─────────────────────────────────────────────────────────

export interface PriceSnapshotData {
  /** Resolved price at the time of purchase (per unit) */
  unitPrice: number;
  /** Currency code at the time of purchase */
  currency: string;
  /** Quantity purchased */
  quantity: number;
  /** Total line item price (unitPrice * quantity) */
  totalLinePrice: number;
  /** Seller offer ID at the time of purchase */
  sellerOfferId: string | null;
  /** Seller ID at the time of purchase */
  sellerId: string;
  /** Price resolution source: 'seller_offer' | 'catalog_default' | 'promotion' | 'configuration_override' */
  priceSource: string;
  /** Any applicable promotion or discount applied at purchase */
  appliedDiscount: number | null;
  /** Original price before any discount */
  originalPrice: number | null;
}

/**
 * Immutable snapshot of the price a customer paid at order time.
 * Captures the full price resolution context so historical prices
 * remain interpretable even if catalog pricing changes.
 */
export class PriceSnapshot {
  public readonly unitPrice: number;
  public readonly currency: string;
  public readonly quantity: number;
  public readonly totalLinePrice: number;
  public readonly sellerOfferId: string | null;
  public readonly sellerId: string;
  public readonly priceSource: string;
  public readonly appliedDiscount: number | null;
  public readonly originalPrice: number | null;

  constructor(data: PriceSnapshotData) {
    this.unitPrice = data.unitPrice;
    this.currency = data.currency;
    this.quantity = data.quantity;
    this.totalLinePrice = data.totalLinePrice;
    this.sellerOfferId = data.sellerOfferId;
    this.sellerId = data.sellerId;
    this.priceSource = data.priceSource;
    this.appliedDiscount = data.appliedDiscount;
    this.originalPrice = data.originalPrice;
    Object.freeze(this);
  }

  toJSON(): PriceSnapshotData {
    return {
      unitPrice: this.unitPrice,
      currency: this.currency,
      quantity: this.quantity,
      totalLinePrice: this.totalLinePrice,
      sellerOfferId: this.sellerOfferId,
      sellerId: this.sellerId,
      priceSource: this.priceSource,
      appliedDiscount: this.appliedDiscount,
      originalPrice: this.originalPrice,
    };
  }

  static fromJSON(data: PriceSnapshotData): PriceSnapshot {
    return new PriceSnapshot(data);
  }
}

// ── Fulfillment Snapshot ───────────────────────────────────────────────────

export interface FulfillmentSnapshotData {
  /** Fulfillment policy at the time of purchase */
  fulfillmentPolicy: string;
  /** Lead time in days at the time of purchase */
  leadTimeDays: number;
  /** Delivery method selected by the customer */
  deliveryMethod: string | null;
  /** Shipping cost at the time of purchase */
  shippingCost: number | null;
  /** Estimated delivery date at the time of purchase */
  estimatedDeliveryDate: string | null;
  /** Fulfillment location/warehouse at the time of purchase */
  fulfillmentLocation: string | null;
}

/**
 * Immutable snapshot of fulfillment terms at order time.
 */
export class FulfillmentSnapshot {
  public readonly fulfillmentPolicy: string;
  public readonly leadTimeDays: number;
  public readonly deliveryMethod: string | null;
  public readonly shippingCost: number | null;
  public readonly estimatedDeliveryDate: string | null;
  public readonly fulfillmentLocation: string | null;

  constructor(data: FulfillmentSnapshotData) {
    this.fulfillmentPolicy = data.fulfillmentPolicy;
    this.leadTimeDays = data.leadTimeDays;
    this.deliveryMethod = data.deliveryMethod;
    this.shippingCost = data.shippingCost;
    this.estimatedDeliveryDate = data.estimatedDeliveryDate;
    this.fulfillmentLocation = data.fulfillmentLocation;
    Object.freeze(this);
  }

  toJSON(): FulfillmentSnapshotData {
    return {
      fulfillmentPolicy: this.fulfillmentPolicy,
      leadTimeDays: this.leadTimeDays,
      deliveryMethod: this.deliveryMethod,
      shippingCost: this.shippingCost,
      estimatedDeliveryDate: this.estimatedDeliveryDate,
      fulfillmentLocation: this.fulfillmentLocation,
    };
  }

  static fromJSON(data: FulfillmentSnapshotData): FulfillmentSnapshot {
    return new FulfillmentSnapshot(data);
  }
}

// ── Order Item Snapshot (composite) ────────────────────────────────────────

export interface OrderItemSnapshotData {
  configuration: ConfigurationSnapshotData;
  price: PriceSnapshotData;
  fulfillment: FulfillmentSnapshotData | null;
}

/**
 * Composite immutable snapshot capturing the complete state of an order line item
 * at the moment of purchase. Contains configuration, price, and fulfillment snapshots.
 *
 * This is the authoritative record of what the customer purchased. It must never
 * be reconstructed from current catalog state — it is frozen at order creation.
 */
export class OrderItemSnapshot {
  public readonly configuration: ConfigurationSnapshot;
  public readonly price: PriceSnapshot;
  public readonly fulfillment: FulfillmentSnapshot | null;

  constructor(data: OrderItemSnapshotData) {
    this.configuration = data.configuration instanceof ConfigurationSnapshot
      ? data.configuration
      : new ConfigurationSnapshot(data.configuration);
    this.price = data.price instanceof PriceSnapshot
      ? data.price
      : new PriceSnapshot(data.price);
    this.fulfillment = data.fulfillment
      ? (data.fulfillment instanceof FulfillmentSnapshot
        ? data.fulfillment
        : new FulfillmentSnapshot(data.fulfillment))
      : null;
    Object.freeze(this);
  }

  toJSON(): OrderItemSnapshotData {
    return {
      configuration: this.configuration.toJSON(),
      price: this.price.toJSON(),
      fulfillment: this.fulfillment ? this.fulfillment.toJSON() : null,
    };
  }

  static fromJSON(data: OrderItemSnapshotData): OrderItemSnapshot {
    return new OrderItemSnapshot({
      configuration: ConfigurationSnapshot.fromJSON(data.configuration),
      price: PriceSnapshot.fromJSON(data.price),
      fulfillment: data.fulfillment ? FulfillmentSnapshot.fromJSON(data.fulfillment) : null,
    });
  }
}
