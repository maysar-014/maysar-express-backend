import { ApiResponse, CartDTO, CartItemDTO, CheckoutSessionDTO, AddToCartRequest, ConfirmCheckoutRequest } from './checkout.dto';

describe('Checkout DTOs', () => {
  describe('CartItemDTO', () => {
    it('should create valid cart item', () => {
      const item: CartItemDTO = {
        productId: 'p1',
        variantId: 'v1',
        quantity: 2,
        priceAtTime: 100,
        lineTotal: 200
      };
      expect(item.productId).toBe('p1');
      expect(item.quantity).toBe(2);
      expect(item.priceAtTime).toBe(100);
      expect(item.lineTotal).toBe(200);
    });

    it('should calculate item total', () => {
      const item: CartItemDTO = {
        productId: 'p1',
        quantity: 3,
        priceAtTime: 50,
        lineTotal: 150
      };
      expect(item.lineTotal).toBe(150);
    });
  });

  describe('CartDTO', () => {
    it('should create valid cart dto', () => {
      const cart: CartDTO = {
        id: 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        userId: 'usr_test_0001',
        items: [
          { productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV', quantity: 1, priceAtTime: 100, lineTotal: 100 }
        ],
        subtotal: 100,
        itemCount: 1,
        createdAt: new Date('2026-03-28T00:00:00.000Z'),
        updatedAt: new Date('2026-03-28T00:00:00.000Z')
      };

      expect(cart.id).toContain('chk_cart_');
      expect(cart.items).toHaveLength(1);
    });
  });

  describe('CheckoutSessionDTO', () => {
    it('should create valid checkout session', () => {
      const checkout: CheckoutSessionDTO = {
        id: 'chk_ses_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        cartId: 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        userId: 'usr_test_0001',
        enablerId: undefined,
        enablerCode: undefined,
        status: 'initiated',
        pricing: {
          subtotal: 100,
          taxAmount: 10,
          shippingCost: 5,
          discountAmount: 0,
          total: 115
        },
        deliveryEligible: true,
        minimumBasketValue: 50000,
        minimumBasketShortfall: 0,
        expiresAt: new Date('2026-03-28T01:00:00.000Z'),
        createdAt: new Date('2026-03-28T00:00:00.000Z')
      };

      expect(checkout.pricing.total).toBe(115);
    });
  });

  describe('Request DTOs', () => {
    it('should create add-to-cart request', () => {
      const request: AddToCartRequest = {
        cartId: 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        userId: 'usr_test_0001',
        productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        quantity: 1,
        priceAtTime: 100
      };

      expect(request.quantity).toBe(1);
    });

    it('should create confirm checkout request', () => {
      const request: ConfirmCheckoutRequest = {
        sessionId: 'chk_ses_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        paymentMethodId: 'pay_mth_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      };

      expect(request.paymentMethodId).toContain('pay_');
    });
  });

  describe('ApiResponse', () => {
    it('should support typed response envelopes', () => {
      const response: ApiResponse<CheckoutSessionDTO> = {
        success: true,
        data: {
          id: 'chk_ses_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          cartId: 'chk_cart_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          userId: 'usr_test_0001',
          status: 'initiated',
          pricing: {
            subtotal: 100,
            taxAmount: 10,
            shippingCost: 5,
            discountAmount: 0,
            total: 115
          },
          deliveryEligible: true,
          minimumBasketValue: 50000,
          minimumBasketShortfall: 0,
          expiresAt: new Date('2026-03-28T01:00:00.000Z'),
          createdAt: new Date('2026-03-28T00:00:00.000Z')
        },
        timestamp: new Date('2026-03-28T00:00:00.000Z')
      };

      expect(response.success).toBe(true);
      expect(response.data?.pricing.total).toBe(115);
    });
  });
});
