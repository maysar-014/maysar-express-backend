import { CartRepository } from '../cart.repository';
import { CheckoutRepository } from '../checkout.repository';
import { Cart } from '../../../domain/value-objects/cart.value-object';

describe('CartRepository Integration Tests', () => {
  let repository: CartRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cart: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn()
      }
    };
    repository = new CartRepository(mockPrisma);
  });

  describe('Save Operations', () => {
    it('should save cart with items', async () => {
      const cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 2, priceAtTime: 50 }]
      });

      await repository.save('cart-1', 'user-1', cart);

      expect(mockPrisma.cart.upsert).toHaveBeenCalled();
    });

    it('should handle empty cart', async () => {
      const cart = new Cart({ items: [] });

      await repository.save('cart-1', 'user-1', cart);

      expect(mockPrisma.cart.upsert).toHaveBeenCalled();
    });

    it('should update existing cart', async () => {
      const cart = new Cart({
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });

      await repository.save('cart-1', 'user-1', cart);
      await repository.save('cart-1', 'user-1', cart);

      expect(mockPrisma.cart.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retrieval Operations', () => {
    it('should retrieve cart by id', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [{ productId: 'prod-1', quantity: 1, priceAtTime: 50 }]
      });

      const result = await repository.getById('cart-1');

      expect(result).toBeDefined();
      expect(result?.items).toHaveLength(1);
    });

    it('should return null for non-existent cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const result = await repository.getById('cart-999');

      expect(result).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    it('should delete cart', async () => {
      await repository.delete('cart-1');

      expect(mockPrisma.cart.delete).toHaveBeenCalledWith({
        where: { id: 'cart-1' }
      });
    });
  });
});

describe('CheckoutRepository Integration Tests', () => {
  let repository: CheckoutRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      checkoutSession: {
        upsert: jest.fn(),
        findUnique: jest.fn()
      },
      order: {
        create: jest.fn(),
        findUnique: jest.fn()
      }
    };
    repository = new CheckoutRepository(mockPrisma);
  });

  describe('Session Operations', () => {
    it('should save checkout session', async () => {
      const session = {
        id: 'session-1',
        cartId: 'cart-1',
        userId: 'user-1',
        status: 'initiated',
        totalAmount: 100
      };

      await repository.saveSession(session);

      expect(mockPrisma.checkoutSession.upsert).toHaveBeenCalled();
    });

    it('should retrieve checkout session', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue({
        id: 'session-1',
        status: 'initiated'
      });

      const result = await repository.getSession('session-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('initiated');
    });
  });

  describe('Order Operations', () => {
    it('should create order', async () => {
      const order = {
        id: 'order-1',
        checkoutSessionId: 'session-1',
        userId: 'user-1',
        totalAmount: 100,
        items: []
      };

      await repository.saveOrder(order);

      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    it('should retrieve order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'pending'
      });

      const result = await repository.getOrder('order-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });
});
