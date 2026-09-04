/**
 * ProductLocation Entity
 *
 * Represents the presence of a product at a specific seller location,
 * including its available and reserved stock quantities.
 *
 * Products themselves do NOT store addresses.
 * This entity is the canonical inventory record per (product, location).
 */

export interface ProductLocationProps {
  id: string;
  productId: string;
  locationId: string;
  sellerId: string;
  quantityAvailable: number;
  quantityReserved: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductLocation {
  readonly id: string;
  readonly productId: string;
  readonly locationId: string;
  readonly sellerId: string;
  quantityAvailable: number;
  quantityReserved: number;
  isAvailable: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ProductLocationProps) {
    if (!props.id) throw new Error('ProductLocation id is required');
    if (!props.productId) throw new Error('productId is required');
    if (!props.locationId) throw new Error('locationId is required');
    if (!props.sellerId) throw new Error('sellerId is required');
    if (props.quantityAvailable < 0) throw new Error('quantityAvailable cannot be negative');
    if (props.quantityReserved < 0) throw new Error('quantityReserved cannot be negative');

    this.id = props.id;
    this.productId = props.productId;
    this.locationId = props.locationId;
    this.sellerId = props.sellerId;
    this.quantityAvailable = props.quantityAvailable;
    this.quantityReserved = props.quantityReserved;
    this.isAvailable = props.isAvailable;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Net stock visible to buyers */
  get netAvailable(): number {
    return Math.max(0, this.quantityAvailable - this.quantityReserved);
  }

  reserve(qty: number): void {
    if (qty <= 0) throw new Error('Reserve quantity must be positive');
    if (this.netAvailable < qty) throw new Error('Insufficient stock to reserve');
    this.quantityReserved += qty;
    this.updatedAt = new Date();
  }

  release(qty: number): void {
    if (qty <= 0) throw new Error('Release quantity must be positive');
    this.quantityReserved = Math.max(0, this.quantityReserved - qty);
    this.updatedAt = new Date();
  }

  adjustStock(delta: number): void {
    const newQty = this.quantityAvailable + delta;
    if (newQty < 0) throw new Error('Stock adjustment would result in negative quantity');
    this.quantityAvailable = newQty;
    this.updatedAt = new Date();
  }
}
