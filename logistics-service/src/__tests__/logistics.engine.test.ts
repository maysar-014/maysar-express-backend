import { LogisticsEngine } from '../engines/logistics.engine';

describe('LogisticsEngine', () => {
  let engine: LogisticsEngine;

  beforeEach(() => {
    engine = new LogisticsEngine();
  });

  describe('processLogisticsRequest', () => {
    it('should successfully process a valid logistics request', async () => {
      const input = {
        orderId: 'test_order_123',
        pickupAddress: {
          street: 'Test Pickup Street',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          country: 'Tanzania',
          coordinates: { lat: -6.7924, lng: 39.2083 },
          contactName: 'Test Sender',
          contactPhone: '+255712345678'
        },
        deliveryAddress: {
          street: 'Test Delivery Street',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          country: 'Tanzania',
          coordinates: { lat: -6.8000, lng: 39.2100 },
          contactName: 'Test Receiver',
          contactPhone: '+255723456789'
        },
        packageDetails: {
          weight: 2.5,
          dimensions: { length: 30, width: 20, height: 15 },
          value: 50000,
          fragile: false,
          perishable: false,
          hazardous: false,
          items: [{
            productId: 'prod_123',
            name: 'Test Product',
            quantity: 1,
            weight: 2.5,
            value: 50000
          }]
        },
        serviceType: 'express' as const,
        priority: 'high' as const
      };

      const result = await engine.processLogisticsRequest(input);

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBeDefined();
      expect(result.shippingCost).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.courierAssignment).toBeDefined();
      expect(result.trackingInfo).toBeDefined();
      expect(result.route).toBeDefined();
    });

    it('should handle invalid input gracefully', async () => {
      const invalidInput = {
        orderId: '',
        pickupAddress: null,
        deliveryAddress: null,
        packageDetails: null,
        serviceType: 'express' as const,
        priority: 'high' as const
      };

      const result = await engine.processLogisticsRequest(invalidInput as any);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Logistics validation failed: Order ID required, Pickup address required, Delivery address required, Package details required');
    });

    it('should calculate shipping cost correctly', async () => {
      const input = {
        orderId: 'test_order_123',
        pickupAddress: {
          street: 'Test Street',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          country: 'Tanzania',
          contactName: 'Test',
          contactPhone: '+255712345678'
        },
        deliveryAddress: {
          street: 'Test Street 2',
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          country: 'Tanzania',
          contactName: 'Test 2',
          contactPhone: '+255723456789'
        },
        packageDetails: {
          weight: 5.0,
          dimensions: { length: 30, width: 20, height: 15 },
          value: 100000,
          fragile: true,
          perishable: false,
          hazardous: false,
          items: []
        },
        serviceType: 'same_day' as const,
        priority: 'urgent' as const
      };

      const result = await engine.processLogisticsRequest(input);

      expect(result.success).toBe(true);
      expect(result.shippingCost).toBeGreaterThan(15000); // Base + weight + service + priority + fragile
    });
  });
});