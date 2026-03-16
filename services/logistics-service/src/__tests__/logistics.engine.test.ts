import { LogisticsEngine } from '../domain/engines/logistics.engine';

describe('LogisticsEngine', () => {
  let engine: LogisticsEngine;

  beforeEach(() => {
    engine = new LogisticsEngine();
  });

  describe('validateDeliveryInput', () => {
    it('should validate a correct delivery input', () => {
      const result = engine.validateDeliveryInput({
        orderId: 'order-123',
        pickupLocation: { lat: -6.7924, lng: 39.2083, address: 'Pickup' },
        deliveryLocation: { lat: -6.8167, lng: 39.2833, address: 'Delivery' },
        weight: 2.5,
        priority: 'express',
        specialRequirements: ['fragile']
      });

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return violations for invalid input', () => {
      const result = engine.validateDeliveryInput({
        orderId: '',
        pickupLocation: { lat: 120, lng: 39.2083, address: 'Pickup' },
        deliveryLocation: { lat: -6.8167, lng: 220, address: 'Delivery' },
        weight: 0,
        priority: 'invalid' as any
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Order ID is required');
      expect(result.violations).toContain('Invalid pickup latitude');
      expect(result.violations).toContain('Invalid delivery longitude');
      expect(result.violations).toContain('Valid weight is required (0-500kg)');
      expect(result.violations).toContain('Invalid delivery priority');
    });
  });

  describe('calculateDeliveryCost', () => {
    it('should calculate delivery cost with standard priority', () => {
      const cost = engine.calculateDeliveryCost(10, 2, 'standard');
      expect(cost).toBe(6100);
    });

    it('should apply priority multiplier for express', () => {
      const cost = engine.calculateDeliveryCost(10, 2, 'express');
      expect(cost).toBe(12200);
    });
  });
});
