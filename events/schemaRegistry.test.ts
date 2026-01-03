import { eventSchemaRegistry } from './schemaRegistry';

describe('Event Schema Versioning', () => {
  describe('order.created versioning', () => {
    test('v1 schema validates correctly', () => {
      const v1Payload = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-1640995200000-001',
        buyerId: '123e4567-e89b-12d3-a456-426614174001',
        sellerId: '123e4567-e89b-12d3-a456-426614174002',
        items: [{
          productVariantId: '123e4567-e89b-12d3-a456-426614174003',
          quantity: 2,
          unitPrice: 1500,
          totalPrice: 3000
        }],
        totalAmount: 3000,
        currency: 'TZS',
        shippingAddress: {},
        billingAddress: {}
      };

      const result = eventSchemaRegistry.validateEvent('order.created', 'v1', v1Payload);
      expect(result.valid).toBe(true);
    });

    test('v2 schema validates with additional fields', () => {
      const v2Payload = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-1640995200000-001',
        buyerId: '123e4567-e89b-12d3-a456-426614174001',
        sellerId: '123e4567-e89b-12d3-a456-426614174002',
        items: [{
          productVariantId: '123e4567-e89b-12d3-a456-426614174003',
          quantity: 2,
          unitPrice: 1500,
          totalPrice: 3000,
          discountAmount: 100,
          taxAmount: 200
        }],
        totalAmount: 3000,
        currency: 'TZS',
        shippingAddress: {},
        billingAddress: {},
        discountCode: 'SAVE10',
        totalDiscount: 100,
        totalTax: 200,
        orderSource: 'web',
        customerNotes: 'Please deliver after 5pm'
      };

      const result = eventSchemaRegistry.validateEvent('order.created', 'v2', v2Payload);
      expect(result.valid).toBe(true);
    });

    test('v1 payload validates against v2 schema (backward compatible)', () => {
      const v1Payload = {
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-1640995200000-001',
        buyerId: '123e4567-e89b-12d3-a456-426614174001',
        sellerId: '123e4567-e89b-12d3-a456-426614174002',
        items: [{
          productVariantId: '123e4567-e89b-12d3-a456-426614174003',
          quantity: 2,
          unitPrice: 1500,
          totalPrice: 3000
        }],
        totalAmount: 3000,
        currency: 'TZS',
        shippingAddress: {},
        billingAddress: {}
      };

      const result = eventSchemaRegistry.validateEvent('order.created', 'v2', v1Payload);
      expect(result.valid).toBe(true);
    });
  });

  describe('payment.succeeded versioning', () => {
    test('v2 requires processingFee (breaking change)', () => {
      const v1StylePayload = {
        paymentId: '123e4567-e89b-12d3-a456-426614174004',
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 3000,
        currency: 'TZS',
        paymentMethod: 'mobile_money',
        transactionId: 'TXN-123456789'
      };

      const result = eventSchemaRegistry.validateEvent('payment.succeeded', 'v2', v1StylePayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("must have required property 'processingFee'");
    });

    test('v2 validates with required processingFee', () => {
      const v2Payload = {
        paymentId: '123e4567-e89b-12d3-a456-426614174004',
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 3000,
        currency: 'TZS',
        paymentMethod: 'crypto',
        transactionId: 'TXN-123456789',
        processingFee: 50,
        exchangeRate: 1.0,
        originalAmount: 3000,
        originalCurrency: 'TZS'
      };

      const result = eventSchemaRegistry.validateEvent('payment.succeeded', 'v2', v2Payload);
      expect(result.valid).toBe(true);
    });
  });

  describe('version management', () => {
    test('getSupportedVersions returns all versions', () => {
      const versions = eventSchemaRegistry.getSupportedVersions('order.created');
      expect(versions).toContain('v1');
      expect(versions).toContain('v2');
    });

    test('getLatestVersion returns highest version', () => {
      const latest = eventSchemaRegistry.getLatestVersion('order.created');
      expect(latest).toBe('v2');
    });

    test('isVersionDeprecated works correctly', () => {
      expect(eventSchemaRegistry.isVersionDeprecated('payment.succeeded', 'v1')).toBe(true);
      expect(eventSchemaRegistry.isVersionDeprecated('order.created', 'v1')).toBe(false);
    });
  });
});