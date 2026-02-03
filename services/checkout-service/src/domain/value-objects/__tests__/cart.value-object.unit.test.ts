import { Cart, CartItem } from '../cart.value-object';

describe('Cart.value-object', () => {
  describe('CartItem', () => {
    it('should create with valid data', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });
      expect(item.quantity).toBe(2);
    });

    it('should reject zero quantity', () => {
      expect(() => CartItem.fromObject({
        productId: 'prod-1',
        quantity: 0,
        priceAtTime: 50
      })).toThrow();
    });

    it('should reject negative price', () => {
      expect(() => CartItem.fromObject({
        productId: 'prod-1',
        quantity: 1,
        priceAtTime: -10
      })).toThrow();
    });

    it('should calculate line total', () => {
      const item = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 3,
        priceAtTime: 25
      });
      expect(item.getLineTotal()).toBe(75);
    });

    it('should update quantity immutably', () => {
      const original = CartItem.fromObject({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });
      const updated = original.updateQuantity(5);
      expect(original.quantity).toBe(2);
      expect(updated.quantity).toBe(5);
    });
  });

  describe('Cart', () => {
    it('should create empty', () => {
      const cart = new Cart({ items: [] });
      expect(cart.isEmpty()).toBe(true);
    });

    it('should calculate subtotal', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });
      expect(cart.getSubtotal()).toBe(200);
    });

    it('should count items', () => {
      const cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 3, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 2, priceAtTime: 100 }
        ]
      });
      expect(cart.getItemCount()).toBe(5);
    });

    it('should add item', () => {
      let cart = new Cart({ items: [] });
      cart = cart.addItem({
        productId: 'prod-1',
        quantity: 2,
        priceAtTime: 50
      });
      expect(cart.getItems()).toHaveLength(1);
    });

    it('should combine duplicate products', () => {
      let cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      });
      cart = cart.addItem({
        productId: 'prod-1',
        quantity: 3,
        priceAtTime: 50
      });
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].quantity).toBe(5);
    });

    it('should treat variants as separate', () => {
      let cart = new Cart({
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 2, priceAtTime: 50 }]
      });
      cart = cart.addItem({
        productId: 'prod-1',
        variantId: 'var-2',
        quantity: 1,
        priceAtTime: 50
      });
      expect(cart.getItems()).toHaveLength(2);
    });

    it('should remove item', () => {
      let cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });
      cart = cart.removeItem('prod-1');
      expect(cart.getItems()).toHaveLength(1);
    });

    it('should update quantity', () => {
      let cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      });
      cart = cart.updateItemQuantity('prod-1', 5);
      expect(cart.getItems()[0].quantity).toBe(5);
    });

    it('should remove on zero quantity', () => {
      let cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      });
      cart = cart.updateItemQuantity('prod-1', 0);
      expect(cart.isEmpty()).toBe(true);
    });

    it('should clear all items', () => {
      let cart = new Cart({
        items: [
          { productId: 'prod-1', quantity: 2, priceAtTime: 50 },
          { productId: 'prod-2', quantity: 1, priceAtTime: 100 }
        ]
      });
      cart = cart.clear();
      expect(cart.isEmpty()).toBe(true);
    });

    it('should maintain immutability', () => {
      const original = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });
      const originalSubtotal = original.getSubtotal();
      
      const updated = original.addItem({ productId: 'prod-2', quantity: 1, priceAtTime: 50 });
      
      expect(original.getSubtotal()).toBe(originalSubtotal);
      expect(updated.getSubtotal()).toBe(100);
    });

    it('should handle 100+ items', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
        priceAtTime: 10
      }));
      const cart = new Cart({ items });
      expect(cart.getItemCount()).toBe(100);
      expect(cart.getSubtotal()).toBe(1000);
    });
  });
});
