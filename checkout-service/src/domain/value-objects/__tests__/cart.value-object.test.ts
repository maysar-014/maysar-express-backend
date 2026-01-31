/**
 * Cart Value Object Tests
 * 
 * Coverage Target: 95% (business logic)
 * Tests: Immutability, item management, calculations
 */

import { Cart, CartItem } from '../cart.value-object';

describe('CartItem Value Object', () => {
  describe('Construction', () => {
    it('should create cart item with valid data', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });

      expect(item.productId).toBe('prod-1');
      expect(item.quantity).toBe(2);
      expect(item.priceAtTime).toBe(50);
    });

    it('should reject zero quantity', () => {
      expect(() => CartItem.fromObject({
        productId: 'prod-1',
        quantity: 0,
        priceAtTime: 50
      })).toThrow('Quantity must be greater than 0');
    });

    it('should reject negative quantity', () => {
      expect(() => CartItem.fromObject({
        productId: 'prod-1',
        quantity: -5,
        priceAtTime: 50
      })).toThrow('Quantity must be greater than 0');
    });

    it('should reject negative price', () => {
      expect(() => CartItem.fromObject({
        productId: 'prod-1',
        quantity: 1,
        priceAtTime: -10
      })).toThrow('Price cannot be negative');
    });

    it('should handle variant ID', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 1,
        priceAtTime: 50
      });

      expect(item.variantId).toBe('var-1');
    });
  });

  describe('Line Total Calculation', () => {
    it('should calculate line total', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 3,
        priceAtTime: 25
      });

      expect(item.getLineTotal()).toBe(75);
    });

    it('should handle decimal prices', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 19.99
      });

      expect(item.getLineTotal()).toBe(39.98);
    });
  });

  describe('Immutability', () => {
    it('should create new item on quantity update', () => {
      const original = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });

      const updated = original.updateQuantity(5);

      expect(original.quantity).toBe(2);
      expect(updated.quantity).toBe(5);
      expect(original).not.toBe(updated);
    });

    it('should preserve other properties on update', () => {
      const original = CartItem.fromObject({
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        priceAtTime: 50
      });

      const updated = original.updateQuantity(5);

      expect(updated.productId).toBe('prod-1');
      expect(updated.variantId).toBe('var-1');
      expect(updated.priceAtTime).toBe(50);
    });
  });
});

describe('Cart Value Object', () => {
  describe('Construction', () => {
    it('should create empty cart', () => {
      const cart = new Cart({ items: [] });
      expect(cart.isEmpty()).toBe(true);
      expect(cart.getItems()).toEqual([]);
    });

    it('should create cart with items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });

      expect(cart.getItems()).toHaveLength(2);
      expect(cart.isEmpty()).toBe(false);
    });
  });

  describe('Subtotal Calculation', () => {
    it('should calculate subtotal', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });

      expect(cart.getSubtotal()).toBe(200);
    });

    it('should handle empty cart', () => {
      const cart = new Cart({ items: [] });
      expect(cart.getSubtotal()).toBe(0);
    });

    it('should handle decimal prices', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 19.99 }
        ]
      });

      expect(cart.getSubtotal()).toBe(39.98);
    });
  });

  describe('Item Count', () => {
    it('should count total items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 3, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 2, priceAtTime: 100 }
        ]
      });

      expect(cart.getItemCount()).toBe(5);
    });

    it('should return zero for empty cart', () => {
      const cart = new Cart({ items: [] });
      expect(cart.getItemCount()).toBe(0);
    });
  });

  describe('Add Item', () => {
    it('should add new item to cart', () => {
      const cart = new Cart({ items: [] });
      const updated = cart.addItem({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });

      expect(updated.getItems()).toHaveLength(1);
      expect(updated.getSubtotal()).toBe(100);
    });

    it('should combine quantities for duplicate product', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.addItem({
        productId: 'prod-1',
        quantity: 3,
        priceAtTime: 50
      });

      expect(updated.getItems()).toHaveLength(1);
      expect(updated.getItems()[0].quantity).toBe(5);
    });

    it('should treat different variants as separate items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', variantId: 'var-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.addItem({
        productId: 'prod-1',
        variantId: 'var-2',
        quantity: 1,
        priceAtTime: 50
      });

      expect(updated.getItems()).toHaveLength(2);
    });

    it('should preserve immutability', () => {
      const original = new Cart({ items: [] });
      const updated = original.addItem({
        productId: 'prod-1',
        quantity: 1,
        priceAtTime: 50
      });

      expect(original.isEmpty()).toBe(true);
      expect(updated.isEmpty()).toBe(false);
    });
  });

  describe('Remove Item', () => {
    it('should remove item from cart', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });

      const updated = cart.removeItem('prod-1');

      expect(updated.getItems()).toHaveLength(1);
      expect(updated.getItems()[0].productId).toBe('prod-2');
    });

    it('should handle removing non-existent item', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.removeItem('prod-999');

      expect(updated.getItems()).toHaveLength(1);
    });

    it('should remove by variant', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', variantId: 'var-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-1', variantId: 'var-2', quantity: 1, priceAtTime: 50 }
        ]
      });

      const updated = cart.removeItem('prod-1', 'var-1');

      expect(updated.getItems()).toHaveLength(1);
      expect(updated.getItems()[0].variantId).toBe('var-2');
    });
  });

  describe('Update Item Quantity', () => {
    it('should update item quantity', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.updateItemQuantity('prod-1', 5);

      expect(updated.getItems()[0].quantity).toBe(5);
      expect(updated.getSubtotal()).toBe(250);
    });

    it('should remove item when quantity set to zero', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.updateItemQuantity('prod-1', 0);

      expect(updated.isEmpty()).toBe(true);
    });

    it('should remove item when quantity set to negative', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const updated = cart.updateItemQuantity('prod-1', -5);

      expect(updated.isEmpty()).toBe(true);
    });

    it('should update by variant', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', variantId: 'var-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-1', variantId: 'var-2', quantity: 1, priceAtTime: 50 }
        ]
      });

      const updated = cart.updateItemQuantity('prod-1', 10, 'var-1');

      expect(updated.getItems()[0].quantity).toBe(10);
      expect(updated.getItems()[1].quantity).toBe(1);
    });
  });

  describe('Clear Cart', () => {
    it('should clear all items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });

      const cleared = cart.clear();

      expect(cleared.isEmpty()).toBe(true);
      expect(cleared.getSubtotal()).toBe(0);
    });

    it('should preserve immutability on clear', () => {
      const original = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const cleared = original.clear();

      expect(original.isEmpty()).toBe(false);
      expect(cleared.isEmpty()).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should return copy of items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 }
        ]
      });

      const items1 = cart.getItems();
      const items2 = cart.getItems();

      expect(items1).not.toBe(items2);
      expect(items1).toEqual(items2);
    });
  });
});
