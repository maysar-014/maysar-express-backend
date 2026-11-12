// @ts-nocheck
/**
 * SellerOffer Entity
 * ENH-001: Separates seller commercial terms from canonical product identity.
 *
 * Constitution §8:
 * "A seller offer represents a seller's commercial commitment to supply
 * a product or a specific configuration. It is separate from the global
 * product and variant."
 */

import { DomainError } from '../errors/domain.error';

// ── Types ────────────────────────────────────────────────────────────────────

export type SellerOfferStatus = 'draft' | 'active' | 'suspended' | 'archived';

export type ProductCondition = 'new' | 'used' | 'refurbished' | 'damaged';

export type FulfillmentPolicy = 'seller_fulfilled' | 'platform_fulfilled' | 'dropship';

export interface SellerOfferData {
  id: string;
  productId: string;
  sellerId: string;
  sellerSku: string | null;
  price: number;
  currency: string;
  stockAvailable: number;
  condition: ProductCondition;
  fulfillmentPolicy: FulfillmentPolicy;
  warranty: string | null;
  returnConditions: string | null;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  status: SellerOfferStatus;
  /** null = universal coverage (all configurations); string[] = specific configuration fingerprints */
  configurationCoverage: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// ── Valid transitions map ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SellerOfferStatus, SellerOfferStatus[]> = {
  draft: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active'],
  archived: [],
};

// ── Entity ──────────────────────────────────────────────────────────────────

export class SellerOffer {
  constructor(
    private readonly id: string,
    private readonly productId: string,
    private readonly sellerId: string,
    private sellerSku: string | null,
    private price: number,
    private currency: string,
    private stockAvailable: number,
    private condition: ProductCondition,
    private fulfillmentPolicy: FulfillmentPolicy,
    private warranty: string | null,
    private returnConditions: string | null,
    private minimumOrderQuantity: number,
    private leadTimeDays: number,
    private status: SellerOfferStatus,
    private configurationCoverage: string[] | null,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date(),
  ) {}

  // ── Getters ──────────────────────────────────────────────────────────────────

  getId(): string { return this.id; }
  getProductId(): string { return this.productId; }
  getSellerId(): string { return this.sellerId; }
  getSellerSku(): string | null { return this.sellerSku; }
  getPrice(): number { return this.price; }
  getCurrency(): string { return this.currency; }
  getStockAvailable(): number { return this.stockAvailable; }
  getCondition(): ProductCondition { return this.condition; }
  getFulfillmentPolicy(): FulfillmentPolicy { return this.fulfillmentPolicy; }
  getWarranty(): string | null { return this.warranty; }
  getReturnConditions(): string | null { return this.returnConditions; }
  getMinimumOrderQuantity(): number { return this.minimumOrderQuantity; }
  getLeadTimeDays(): number { return this.leadTimeDays; }
  getStatus(): SellerOfferStatus { return this.status; }
  getConfigurationCoverage(): string[] | null { return this.configurationCoverage; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  // ── Status Lifecycle ──────────────────────────────────────────────────────

  transitionTo(newStatus: SellerOfferStatus): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived SellerOffer', 'ARCHIVED_OFFER');
    }
    const allowed = VALID_TRANSITIONS[this.status];
    if (!allowed.includes(newStatus)) {
      throw new DomainError(
        `Invalid status transition: ${this.status} → ${newStatus}`,
        'INVALID_STATUS_TRANSITION',
      );
    }
    if (newStatus === 'active' && this.price <= 0) {
      throw new DomainError('Cannot activate offer with price <= 0', 'INVALID_PRICE');
    }
    this.status = newStatus;
    this.touch();
  }

  // ── Commercial Updates ────────────────────────────────────────────────────

  updatePrice(price: number, currency?: string): void {
    this.ensureNotArchived();
    if (price <= 0) {
      throw new DomainError('Price must be > 0', 'INVALID_PRICE');
    }
    this.price = price;
    if (currency) this.currency = currency;
    this.touch();
  }

  updateStock(stockAvailable: number): void {
    this.ensureNotArchived();
    if (stockAvailable < 0) {
      throw new DomainError('Stock cannot be negative', 'INVALID_STOCK');
    }
    this.stockAvailable = stockAvailable;
    this.touch();
  }

  updateFulfillment(policy: FulfillmentPolicy, warranty: string | null, returnConditions: string | null): void {
    this.ensureNotArchived();
    this.fulfillmentPolicy = policy;
    this.warranty = warranty;
    this.returnConditions = returnConditions;
    this.touch();
  }

  setConfigurationCoverage(fingerprints: string[] | null): void {
    this.ensureNotArchived();
    this.configurationCoverage = fingerprints;
    this.touch();
  }

  // ── Coverage Check ──────────────────────────────────────────────────────────

  /**
   * Returns true if this offer can fulfill the given configuration fingerprint.
   * null coverage means universal (all configurations).
   */
  canFulfill(configurationFingerprint: string | null): boolean {
    if (this.configurationCoverage === null) return true; // universal
    if (configurationFingerprint === null) return true; // product without config
    return this.configurationCoverage.includes(configurationFingerprint);
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  toJSON(): SellerOfferData {
    return {
      id: this.id,
      productId: this.productId,
      sellerId: this.sellerId,
      sellerSku: this.sellerSku,
      price: this.price,
      currency: this.currency,
      stockAvailable: this.stockAvailable,
      condition: this.condition,
      fulfillmentPolicy: this.fulfillmentPolicy,
      warranty: this.warranty,
      returnConditions: this.returnConditions,
      minimumOrderQuantity: this.minimumOrderQuantity,
      leadTimeDays: this.leadTimeDays,
      status: this.status,
      configurationCoverage: this.configurationCoverage,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static fromJSON(data: SellerOfferData): SellerOffer {
    return new SellerOffer(
      data.id, data.productId, data.sellerId, data.sellerSku,
      data.price, data.currency, data.stockAvailable, data.condition,
      data.fulfillmentPolicy, data.warranty, data.returnConditions,
      data.minimumOrderQuantity, data.leadTimeDays, data.status,
      data.configurationCoverage,
      new Date(data.createdAt), new Date(data.updatedAt),
    );
  }

  // ── Factory ──────────────────────────────────────────────────────────────────

  static create(productId: string, sellerId: string, price: number, currency: string = 'TZS'): SellerOffer {
    return new SellerOffer(
      `offer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId, sellerId, null, price, currency, 0,
      'new', 'seller_fulfilled', null, null, 1, 0,
      'draft', null, new Date(), new Date(),
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private ensureNotArchived(): void {
    if (this.status === 'archived') {
      throw new DomainError('Cannot modify archived SellerOffer', 'ARCHIVED_OFFER');
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
