/**
 * Cart Value Object
 * Represents a shopping cart
 */

export interface CartItemVO {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export class CartItem {
  constructor(
    public productId: string,
    public variantId: string | undefined,
    public quantity: number,
    public priceAtTime: number
  ) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (priceAtTime < 0) {
      throw new Error('Price cannot be negative');
    }
  }

  static fromObject(obj: CartItemVO): CartItem {
    return new CartItem(obj.productId, obj.variantId, obj.quantity, obj.priceAtTime);
  }

  getLineTotal(): number {
    return this.quantity * this.priceAtTime;
  }

  updateQuantity(quantity: number): CartItem {
    return new CartItem(this.productId, this.variantId, quantity, this.priceAtTime);
  }
}

export interface CartConstructorParams {
  id?: string;
  userId?: string;
  items?: CartItemVO[];
}

export class Cart {
  public id: string;
  public userId: string;
  public items: CartItemVO[];

  constructor(params: CartConstructorParams = {}) {
    this.id = params.id || '';
    this.userId = params.userId || '';
    this.items = params.items || [];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  getTotalItems(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getItemCount(): number {
    return this.getTotalItems();
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.priceAtTime * item.quantity, 0);
  }

  getItems(): CartItemVO[] {
    return [...this.items];
  }

  addItem(item: CartItemVO): Cart {
    const newItems = [...this.items];
    const existingItem = newItems.find(
      i => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      newItems.push({ ...item });
    }

    return new Cart({
      id: this.id,
      userId: this.userId,
      items: newItems
    });
  }

  removeItem(productId: string, variantId?: string): Cart {
    const newItems = this.items.filter(
      i => !(i.productId === productId && i.variantId === variantId)
    );
    return new Cart({
      id: this.id,
      userId: this.userId,
      items: newItems
    });
  }

  updateItemQuantity(productId: string, quantity: number, variantId?: string): Cart {
    const newItems = [...this.items];
    const itemIndex = newItems.findIndex(
      i => i.productId === productId && i.variantId === variantId
    );

    if (itemIndex !== -1) {
      if (quantity <= 0) {
        return this.removeItem(productId, variantId);
      } else {
        newItems[itemIndex] = { ...newItems[itemIndex], quantity };
      }
    }

    return new Cart({
      id: this.id,
      userId: this.userId,
      items: newItems
    });
  }

  clear(): Cart {
    return new Cart({
      id: this.id,
      userId: this.userId,
      items: []
    });
  }
}
