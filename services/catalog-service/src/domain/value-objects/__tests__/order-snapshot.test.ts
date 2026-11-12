// @ts-nocheck
/**
 * Order Snapshot Value Objects — Tests
 *
 * Verifies immutability, serialization round-trip, and simple product detection.
 *
 * Feature: seller-offer-domain (ENH-008)
 */

import {
  ConfigurationSnapshot,
  PriceSnapshot,
  FulfillmentSnapshot,
  OrderItemSnapshot,
} from '../order-snapshot.value-object';

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('ConfigurationSnapshot', () => {
  it('should be immutable (frozen)', () => {
    const snap = new ConfigurationSnapshot({
      productId: `prod-${randomSuffix()}`,
      productName: 'Test Product',
      productImage: null,
      variantId: null,
      selectedConfiguration: null,
      configurationDefinitionVersion: null,
      configurationFingerprint: null,
    });
    expect(() => { (snap as any).productName = 'Changed'; }).toThrow();
  });

  it('should detect simple products (no configuration)', () => {
    const simple = new ConfigurationSnapshot({
      productId: 'p1', productName: 'Chair', productImage: null,
      variantId: null, selectedConfiguration: null,
      configurationDefinitionVersion: null, configurationFingerprint: null,
    });
    expect(simple.isSimpleProduct()).toBe(true);

    const configured = new ConfigurationSnapshot({
      productId: 'p1', productName: 'Phone', productImage: null,
      variantId: 'v1', selectedConfiguration: { colour: 'Black' },
      configurationDefinitionVersion: 1, configurationFingerprint: 'abc123',
    });
    expect(configured.isSimpleProduct()).toBe(false);
  });

  it('should serialize and deserialize correctly', () => {
    const data = {
      productId: `prod-${randomSuffix()}`,
      productName: 'Test Product',
      productImage: 'https://example.com/img.jpg',
      variantId: `var-${randomSuffix()}`,
      selectedConfiguration: { colour: 'Black', storage: '128GB' },
      configurationDefinitionVersion: 2,
      configurationFingerprint: 'fp-abc123',
    };
    const snap = new ConfigurationSnapshot(data);
    const json = snap.toJSON();
    const restored = ConfigurationSnapshot.fromJSON(json);
    expect(restored.toJSON()).toEqual(json);
    expect(restored.productId).toBe(data.productId);
    expect(restored.selectedConfiguration).toEqual(data.selectedConfiguration);
  });

  it('should freeze selectedConfiguration map', () => {
    const snap = new ConfigurationSnapshot({
      productId: 'p1', productName: 'Phone', productImage: null,
      variantId: 'v1', selectedConfiguration: { colour: 'Black' },
      configurationDefinitionVersion: 1, configurationFingerprint: 'fp1',
    });
    expect(() => { (snap.selectedConfiguration as any).colour = 'Blue'; }).toThrow();
  });
});

describe('PriceSnapshot', () => {
  it('should be immutable (frozen)', () => {
    const snap = new PriceSnapshot({
      unitPrice: 50000, currency: 'TZS', quantity: 2, totalLinePrice: 100000,
      sellerOfferId: 'offer-1', sellerId: 'seller-1', priceSource: 'seller_offer',
      appliedDiscount: null, originalPrice: null,
    });
    expect(() => { (snap as any).unitPrice = 99999; }).toThrow();
  });

  it('should serialize and deserialize correctly', () => {
    const data = {
      unitPrice: randomInt(100, 500000), currency: 'TZS', quantity: randomInt(1, 10),
      totalLinePrice: 0, sellerOfferId: `offer-${randomSuffix()}`, sellerId: `seller-${randomSuffix()}`,
      priceSource: 'seller_offer', appliedDiscount: 5000, originalPrice: 55000,
    };
    data.totalLinePrice = data.unitPrice * data.quantity;
    const snap = new PriceSnapshot(data);
    const json = snap.toJSON();
    const restored = PriceSnapshot.fromJSON(json);
    expect(restored.toJSON()).toEqual(json);
    expect(restored.unitPrice).toBe(data.unitPrice);
    expect(restored.totalLinePrice).toBe(data.totalLinePrice);
  });
});

describe('FulfillmentSnapshot', () => {
  it('should be immutable (frozen)', () => {
    const snap = new FulfillmentSnapshot({
      fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 3, deliveryMethod: 'standard',
      shippingCost: 2500, estimatedDeliveryDate: '2026-11-15', fulfillmentLocation: 'Dar es Salaam',
    });
    expect(() => { (snap as any).leadTimeDays = 99; }).toThrow();
  });
});

describe('OrderItemSnapshot', () => {
  it('should be a composite immutable snapshot', () => {
    const snap = new OrderItemSnapshot({
      configuration: {
        productId: 'p1', productName: 'Phone', productImage: null,
        variantId: 'v1', selectedConfiguration: { colour: 'Black' },
        configurationDefinitionVersion: 1, configurationFingerprint: 'fp1',
      },
      price: {
        unitPrice: 50000, currency: 'TZS', quantity: 1, totalLinePrice: 50000,
        sellerOfferId: 'offer-1', sellerId: 'seller-1', priceSource: 'seller_offer',
        appliedDiscount: null, originalPrice: null,
      },
      fulfillment: {
        fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 3, deliveryMethod: 'standard',
        shippingCost: 2500, estimatedDeliveryDate: '2026-11-15', fulfillmentLocation: 'Dar es Salaam',
      },
    });
    expect(() => { (snap as any).price = null; }).toThrow();
    expect(snap.configuration.productId).toBe('p1');
    expect(snap.price.unitPrice).toBe(50000);
    expect(snap.fulfillment?.leadTimeDays).toBe(3);
  });

  it('should allow null fulfillment snapshot', () => {
    const snap = new OrderItemSnapshot({
      configuration: {
        productId: 'p1', productName: 'Chair', productImage: null,
        variantId: null, selectedConfiguration: null,
        configurationDefinitionVersion: null, configurationFingerprint: null,
      },
      price: {
        unitPrice: 15000, currency: 'TZS', quantity: 1, totalLinePrice: 15000,
        sellerOfferId: null, sellerId: 'seller-1', priceSource: 'catalog_default',
        appliedDiscount: null, originalPrice: null,
      },
      fulfillment: null,
    });
    expect(snap.fulfillment).toBeNull();
    expect(snap.configuration.isSimpleProduct()).toBe(true);
  });

  it('should serialize and deserialize the full composite', () => {
    const data = {
      configuration: {
        productId: 'p1', productName: 'Phone', productImage: 'img.jpg',
        variantId: 'v1', selectedConfiguration: { colour: 'Blue', storage: '256GB' },
        configurationDefinitionVersion: 2, configurationFingerprint: 'fp-xyz',
      },
      price: {
        unitPrice: 75000, currency: 'TZS', quantity: 2, totalLinePrice: 150000,
        sellerOfferId: 'offer-1', sellerId: 'seller-1', priceSource: 'seller_offer',
        appliedDiscount: 10000, originalPrice: 85000,
      },
      fulfillment: {
        fulfillmentPolicy: 'platform_fulfilled', leadTimeDays: 1, deliveryMethod: 'express',
        shippingCost: 5000, estimatedDeliveryDate: '2026-11-12', fulfillmentLocation: 'Warehouse A',
      },
    };
    const snap = new OrderItemSnapshot(data);
    const json = snap.toJSON();
    const restored = OrderItemSnapshot.fromJSON(json);
    expect(restored.toJSON()).toEqual(json);
    expect(restored.configuration.productId).toBe('p1');
    expect(restored.price.totalLinePrice).toBe(150000);
    expect(restored.fulfillment?.deliveryMethod).toBe('express');
  });
});
