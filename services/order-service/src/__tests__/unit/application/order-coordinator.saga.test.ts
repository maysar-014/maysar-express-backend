import { OrderCoordinator } from '../../../application/sagas/order-coordinator.saga';
import { CODPolicy } from '../../../domain/policies/cod.policy';
import { CancellationPolicy } from '../../../domain/policies/cancellation.policy';

// Mock dependencies
jest.mock('../../../domain/policies/cod.policy');
jest.mock('../../../domain/policies/cancellation.policy');

describe('OrderCoordinator Saga', () => {
  let orderCoordinator: OrderCoordinator;
  let mockCodPolicy: jest.Mocked<CODPolicy>;
  let mockCancellationPolicy: CancellationPolicy;

  beforeEach(() => {
    // Create mocks
    mockCodPolicy = new CODPolicy() as jest.Mocked<CODPolicy>;
    mockCancellationPolicy = {} as CancellationPolicy;

    // Setup mock implementations
    mockCodPolicy.validate.mockResolvedValue({ valid: true, errors: [] });

    orderCoordinator = new OrderCoordinator(mockCodPolicy, mockCancellationPolicy);
  });

  describe('validateOrder', () => {
    it('should validate order successfully when all policies pass', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 5.0,
        items: [{ productId: 'prod-1', quantity: 2, price: 100, weight: 1 }],
        paymentMethod: 'cod' as const
      };

      // Act
      const result = await orderCoordinator.validateOrder(orderData);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockCodPolicy.validate).toHaveBeenCalledWith(orderData);
    });

    it('should reject order when weight exceeds limit', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 60.0, // Exceeds 50kg limit
        items: [{ productId: 'prod-1', quantity: 1, price: 100, weight: 60 }],
        paymentMethod: 'cod' as const
      };

      // Act
      const result = await orderCoordinator.validateOrder(orderData);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order exceeds maximum weight limit');
    });

    it('should reject order when COD policy fails', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 5.0,
        items: [{ productId: 'prod-1', quantity: 2, price: 100, weight: 1 }],
        paymentMethod: 'cod' as const
      };

      mockCodPolicy.validate.mockResolvedValue({
        valid: false,
        errors: ['COD not allowed for this buyer']
      });

      // Act
      const result = await orderCoordinator.validateOrder(orderData);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('COD not allowed for this buyer');
    });

    it('should aggregate multiple validation errors', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 60.0, // Exceeds weight limit
        items: [{ productId: 'prod-1', quantity: 1, price: 100, weight: 60 }],
        paymentMethod: 'cod' as const
      };

      mockCodPolicy.validate.mockResolvedValue({
        valid: false,
        errors: ['COD not allowed for this buyer', 'Payment method restricted']
      });

      // Act
      const result = await orderCoordinator.validateOrder(orderData);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3); // 2 from COD policy + 1 from weight
      expect(result.errors).toContain('Order exceeds maximum weight limit');
      expect(result.errors).toContain('COD not allowed for this buyer');
      expect(result.errors).toContain('Payment method restricted');
    });
  });

  describe('processOrder', () => {
    it('should create order when validation passes', async () => {
      // Arrange
      const orderData = {
        id: 'order-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 5.0,
        currency: 'TZS',
        totalAmount: 1000,
        items: [{ productId: 'prod-1', quantity: 2, price: { amount: 500, currency: 'TZS' }, weight: 1 }],
        paymentMethod: 'cod' as const,
        deliveryAddress: {
          street: '123 Main St',
          city: 'Dar es Salaam',
          postalCode: '11101',
          country: 'TZ'
        }
      };

      // Act
      const order = await orderCoordinator.processOrder(orderData);

      // Assert
      expect(order).toBeDefined();
      expect(order.id).toBe('order-123');
      expect(order.buyerId).toBe('buyer-123');
      expect(order.sellerId).toBe('seller-456');
      expect(order.status).toBe('pending');
      expect(order.paymentMethod).toBe('cod');
    });

    it('should throw error when validation fails', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 60.0, // Exceeds weight limit
        items: [{ productId: 'prod-1', quantity: 1, price: 100, weight: 60 }],
        paymentMethod: 'cod' as const
      };

      // Act & Assert
      await expect(orderCoordinator.processOrder(orderData))
        .rejects
        .toThrow('Order validation failed: Order exceeds maximum weight limit');
    });
  });

  describe('Saga Orchestration Scenarios', () => {
    it('should handle successful order creation workflow', async () => {
      // Arrange
      const validOrderData = {
        id: 'order-success-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 2.5,
        currency: 'TZS',
        totalAmount: 500,
        items: [{ productId: 'prod-1', quantity: 1, price: { amount: 500, currency: 'TZS' }, weight: 2.5 }],
        paymentMethod: 'cod' as const,
        deliveryAddress: {
          street: '123 Success St',
          city: 'Dar es Salaam',
          postalCode: '11101',
          country: 'TZ'
        }
      };

      // Act
      const order = await orderCoordinator.processOrder(validOrderData);

      // Assert
      expect(order.status).toBe('pending');
      expect(order.canBeCancelled()).toBe(true);
      expect(order.isHeavyOrder()).toBe(false);
    });

    it('should handle heavy order scenario', async () => {
      // Arrange
      const heavyOrderData = {
        id: 'order-heavy-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 25.0, // Heavy order
        currency: 'TZS',
        totalAmount: 25000,
        items: [{ productId: 'prod-heavy', quantity: 1, price: { amount: 25000, currency: 'TZS' }, weight: 25 }],
        paymentMethod: 'cod' as const,
        deliveryAddress: {
          street: '123 Heavy St',
          city: 'Dar es Salaam',
          postalCode: '11101',
          country: 'TZ'
        }
      };

      // Act
      const order = await orderCoordinator.processOrder(heavyOrderData);

      // Assert
      expect(order.isHeavyOrder()).toBe(true);
      expect(order.status).toBe('pending');
    });

    it('should handle compensation scenario when validation fails', async () => {
      // Arrange
      const invalidOrderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 60.0, // Invalid: exceeds weight limit
        items: [{ productId: 'prod-1', quantity: 1, price: 100, weight: 60 }],
        paymentMethod: 'cod' as const
      };

      // Act & Assert
      await expect(orderCoordinator.processOrder(invalidOrderData))
        .rejects
        .toThrow('Order validation failed');

      // Verify no order was created (compensation would handle cleanup)
      // In real scenario, saga would rollback any partial state changes
    });
  });

  describe('Policy Integration', () => {
    it('should correctly integrate COD policy validation', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 5.0,
        items: [{ productId: 'prod-1', quantity: 2, price: 100, weight: 1 }],
        paymentMethod: 'cod' as const
      };

      mockCodPolicy.validate.mockResolvedValue({
        valid: true,
        errors: []
      });

      // Act
      const result = await orderCoordinator.validateOrder(orderData);

      // Assert
      expect(mockCodPolicy.validate).toHaveBeenCalledWith(orderData);
      expect(result.valid).toBe(true);
    });

    it('should handle policy validation errors gracefully', async () => {
      // Arrange
      const orderData = {
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        totalWeight: 5.0,
        items: [{ productId: 'prod-1', quantity: 2, price: 100, weight: 1 }],
        paymentMethod: 'cod' as const
      };

      mockCodPolicy.validate.mockRejectedValue(new Error('Policy service unavailable'));

      // Act & Assert
      await expect(orderCoordinator.validateOrder(orderData))
        .rejects
        .toThrow('Policy service unavailable');
    });
  });
});
