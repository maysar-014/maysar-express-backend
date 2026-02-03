/**
 * Product Entity
 * Domain entity representing a catalog product
 */

import { ProductId, SellerId, CategoryId } from '../value-objects/ids.value-object';
import { Price, CostPrice, WholesalePricing } from '../value-objects/monetary.value-object';
import {
  ProductStatus,
  ProductStatusValue,
  ProductVisibility,
  ProductType,
  Dimensions,
  Weight,
  SEOData,
  ShippingInfo,
  ProductCondition
} from '../value-objects/product-types.value-object';

export class ProductVariant {
  constructor(
    private readonly id: string,
    private readonly sku: string,
    private readonly name: string,
    private readonly price: Price,
    private readonly compareAtPrice?: Price,
    private readonly costPrice?: CostPrice,
    private readonly inventoryQuantity: number = 0,
    private readonly attributes: Record<string, string> = {}
  ) {}

  getId(): string {
    return this.id;
  }

  getSku(): string {
    return this.sku;
  }

  getName(): string {
    return this.name;
  }

  getPrice(): Price {
    return this.price;
  }

  getCompareAtPrice(): Price | undefined {
    return this.compareAtPrice;
  }

  getCostPrice(): CostPrice | undefined {
    return this.costPrice;
  }

  getInventoryQuantity(): number {
    return this.inventoryQuantity;
  }

  getAttributes(): Record<string, string> {
    return { ...this.attributes };
  }

  isInStock(): boolean {
    return this.inventoryQuantity > 0;
  }

  isOnSale(): boolean {
    return this.compareAtPrice !== undefined && this.price.isLessThan(this.compareAtPrice);
  }

  calculateMargin(): number | null {
    if (!this.costPrice) return null;
    return this.costPrice.calculateMargin(this.price);
  }
}

export class Product {
  constructor(
    private readonly id: ProductId,
    private readonly sellerId: SellerId,
    private readonly name: string,
    private readonly description: string,
    private readonly status: ProductStatusValue,
    private readonly type: ProductType,
    private readonly visibility: ProductVisibility = ProductVisibility.PUBLIC,
    private readonly categoryId?: CategoryId,
    private readonly variants: ProductVariant[] = [],
    private readonly images: string[] = [],
    private readonly tags: string[] = [],
    private readonly seoData?: SEOData,
    private readonly shippingInfo?: ShippingInfo,
    private readonly condition: ProductCondition = ProductCondition.NEW,
    private readonly createdAt: Date = new Date(),
    private readonly updatedAt: Date = new Date()
  ) {
    if (!name.trim()) {
      throw new Error('Product name cannot be empty');
    }
    if (!description.trim()) {
      throw new Error('Product description cannot be empty');
    }
    if (variants.length === 0) {
      throw new Error('Product must have at least one variant');
    }
  }

  getId(): ProductId {
    return this.id;
  }

  getSellerId(): SellerId {
    return this.sellerId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getStatus(): ProductStatusValue {
    return this.status;
  }

  getType(): ProductType {
    return this.type;
  }

  getVisibility(): ProductVisibility {
    return this.visibility;
  }

  getCategoryId(): CategoryId | undefined {
    return this.categoryId;
  }

  getVariants(): ProductVariant[] {
    return [...this.variants];
  }

  getDefaultVariant(): ProductVariant {
    return this.variants[0];
  }

  getImages(): string[] {
    return [...this.images];
  }

  getTags(): string[] {
    return [...this.tags];
  }

  getSeoData(): SEOData | undefined {
    return this.seoData;
  }

  getShippingInfo(): ShippingInfo | undefined {
    return this.shippingInfo;
  }

  getCondition(): ProductCondition {
    return this.condition;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business logic methods
  isPublished(): boolean {
    return this.status.isPublished();
  }

  isActive(): boolean {
    return this.status.isActive();
  }

  isVisibleToPublic(): boolean {
    return this.visibility === ProductVisibility.PUBLIC;
  }

  hasVariants(): boolean {
    return this.variants.length > 1;
  }

  getTotalInventory(): number {
    return this.variants.reduce((total, variant) => total + variant.getInventoryQuantity(), 0);
  }

  isInStock(): boolean {
    return this.getTotalInventory() > 0;
  }

  getPriceRange(): { min: Price; max: Price } {
    const prices = this.variants.map(v => v.getPrice());
    const minPrice = prices.reduce((min, price) => price.isLessThan(min) ? price : min);
    const maxPrice = prices.reduce((max, price) => price.isGreaterThan(max) ? price : max);

    return { min: minPrice, max: maxPrice };
  }

  canTransitionToStatus(newStatus: string): boolean {
    return this.status.canTransitionTo(newStatus as ProductStatus);
  }

  static create(
    sellerId: SellerId,
    name: string,
    description: string,
    type: ProductType,
    variants: ProductVariant[],
    options?: {
      categoryId?: CategoryId;
      visibility?: ProductVisibility;
      images?: string[];
      tags?: string[];
      seoData?: SEOData;
      shippingInfo?: ShippingInfo;
      condition?: ProductCondition;
    }
  ): Product {
    const id = ProductId.create();
    const status = new ProductStatusValue(ProductStatus.DRAFT);

    return new Product(
      id,
      sellerId,
      name,
      description,
      status,
      type,
      options?.visibility,
      options?.categoryId,
      variants,
      options?.images,
      options?.tags,
      options?.seoData,
      options?.shippingInfo,
      options?.condition
    );
  }
}
