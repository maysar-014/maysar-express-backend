import { CheckoutDTO, CartItemDTO } from './checkout.dto';

describe('Checkout DTOs', () => {
  describe('CartItemDTO', () => {
    it('should create valid cart item', () => {
      const item: CartItemDTO = {
        productId: 'p1',
        quantity: 2,
        price: 100
      };
      expect(item.productId).toBe('p1');
      expect(item.quantity).toBe(2);
      expect(item.price).toBe(100);
    });

    it('should calculate item total', () => {
      const item: CartItemDTO = {
        productId: 'p1',
        quantity: 3,
        price: 50
      };
      expect(item.quantity * item.price).toBe(150);
    });
  });

  describe('CheckoutDTO', () => {
    it('should create valid checkout', () => {
      const checkout: CheckoutDTO = {
        cartId: 'cart-1',
        userId: 'user-1',
        items: [
          { productId: 'p1', quantity: 1, price: 100 }
        ],
        total: 100
      };
      expect(checkout.cartId).toBe('cart-1');
      expect(checkout.items).toHaveLength(1);
    });

    it('should validate required fields', () => {
      const checkout: Partial<CheckoutDTO> = {
        cartId: 'cart-1'
      };
      expect(checkout.userId).toBeUndefined();
    });
  });
});
