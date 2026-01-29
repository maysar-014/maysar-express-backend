/**
 * Cart Value Object
 * 
 * Represents a shopping cart with immutable business rules.
 * Pure domain logic - no external dependencies.
 */

export interface CartItemData {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export class CartItem {
  readonly productId: string;
  readonly variantId?: string;
  readonly quantity: number;
  readonly priceAtTime: number;

  constructor(data: CartItemData) {
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (data.priceAtTime < 0) {
      throw new Error('Price cannot be negative');
    }

    this.productId = data.productId;
    this.variantId = data.variantId;
    this.quantity = data.quantity;
    this.priceAtTime = data.priceAtTime;
  }

  getLineTotal(): number {
    return this.quantity * this.priceAtTime;
  }

  updateQuantity(newQuantity: number): CartItem {
    return new CartItem({
      productId: this.productId,
      variantId: this.variantId,
      quantity: newQuantity,
      priceAtTime: this.priceAtTime
    });
  }
}

export interface CartData {
  items: CartItemData[];
}

export class Cart {
  private readonly items: CartItem[];

  constructor(data: CartData) {
    this.items = data.items.map(item => new CartItem(item));
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.getLineTotal(), 0);
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  addItem(item: CartItemData): Cart {
    const newItem = new CartItem(item);
    const existingIndex = this.items.findIndex(
      i => i.productId === item.productId && i.variantId === item.variantId
    );

    let updatedItems: CartItem[];
    if (existingIndex >= 0) {
      const existing = this.items[existingIndex];
      updatedItems = [
        ...this.items.slice(0, existingIndex),
        existing.updateQuantity(existing.quantity + item.quantity),
        ...this.items.slice(existingIndex + 1)
      ];
    } else {
      updatedItems = [...this.items, newItem];
    }

    return new Cart({ items: updatedItems.map(i => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      priceAtTime: i.priceAtTime
    })) });
  }

  removeItem(productId: string, variantId?: string): Cart {
    const filtered = this.items.filter(
      i => !(i.productId === productId && i.variantId === variantId)
    );

    return new Cart({ items: filtered.map(i => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      priceAtTime: i.priceAtTime
    })) });
  }

  updateItemQuantity(productId: string, quantity: number, variantId?: string): Cart {
    if (quantity <= 0) {
      return this.removeItem(productId, variantId);
    }

    const updated = this.items.map(item => {
      if (item.productId === productId && item.variantId === variantId) {
        return item.updateQuantity(quantity);
      }
      return item;
    });

    return new Cart({ items: updated.map(i => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      priceAtTime: i.priceAtTime
    })) });
  }

  clear(): Cart {
    return new Cart({ items: [] });
  }
}
