// @ts-nocheck
/**
 * Checkout Transaction Boundary — Tests
 *
 * Verifies the 6-step checkout validation sequence:
 * 1. Configuration validation
 * 2. Seller offer resolution
 * 3. Price precedence (promotion > seller offer > catalog default)
 * 4. Stock check
 * 5. Order snapshot creation
 *
 * Also covers ENH-011 (pricing integration) and ENH-012 (stock check).
 *
 * Feature: checkout-transaction-boundary (ENH-007, ENH-011, ENH-012)
 */

import { CheckoutTransactionBoundaryPolicy, CheckoutValidationContext } from '../checkout-transaction-boundary.policy';
import { ConfigurationDefinitionData } from '../../entities/configuration-definition.entity';

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function makeDefinition(status: 'draft' | 'active' | 'archived' = 'active', numCombinations = 1): ConfigurationDefinitionData {
  const dimId = `dim-${randomSuffix()}`;
  const optId = `opt-${randomSuffix()}`;
  return {
    id: 'cfg-1', productId: 'prod-1', version: 1, status,
    dimensions: [{
      id: dimId, configurationDefinitionId: 'cfg-1', name: 'Colour',
      selectionType: 'selectable', selectionMode: 'single',
      minSelections: 1, maxSelections: 1, required: true, sortOrder: 0,
    }],
    options: [{
      id: optId, configurationDimensionId: dimId, displayValue: 'Black',
      normalizedValue: 'black', sortOrder: 0, active: true,
    }],
    dependencies: [],
    constraints: [],
    combinations: Array.from({ length: numCombinations }, (_, i) => ({
      id: `combo-${i}`, configurationDefinitionId: 'cfg-1',
      optionSelections: { [dimId]: [optId] },
      fingerprint: `fp-${i}-${randomSuffix()}`, active: true,
    })),
    predecessorVersionId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function makeContext(overrides: Partial<CheckoutValidationContext> = {}): CheckoutValidationContext {
  return {
    lineItem: {
      productId: 'prod-1', productName: 'Test Product', productImage: null,
      variantId: null, selectedOptionIds: null, quantity: 1,
    },
    configurationDefinition: null,
    sellerOffer: null,
    catalogDefaultPrice: 50000, catalogDefaultCurrency: 'TZS',
    promotionDiscount: null, promotionOriginalPrice: null,
    deliveryMethod: null, shippingCost: null, estimatedDeliveryDate: null,
    fulfillmentLocation: null,
    ...overrides,
  };
}

describe('CheckoutTransactionBoundaryPolicy', () => {

  // ── Step 1: Configuration Validation ──────────────────────────────────────

  describe('Step 1: Configuration Validation', () => {
    it('should pass for simple products with no configuration definition', () => {
      const ctx = makeContext();
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
    });

    it('should pass for configured products with valid selections matching a combination', () => {
      const def = makeDefinition('active', 1);
      const dimId = def.dimensions[0].id;
      const optId = def.options[0].id;
      const ctx = makeContext({
        configurationDefinition: def,
        lineItem: {
          productId: 'prod-1', productName: 'Phone', productImage: null,
          variantId: null, selectedOptionIds: { [dimId]: [optId] }, quantity: 1,
        },
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
    });
  });

  // ── Step 3: Price Precedence (ENH-011) ──────────────────────────────────────

  describe('Step 3: Price Precedence (ENH-011)', () => {
    it('should use promotion price when promotion is present (highest precedence)', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
        promotionDiscount: 5000,
        promotionOriginalPrice: 45000,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.resolvedPrice).toBe(40000); // 45000 - 5000
      expect(result.priceSource).toBe('promotion');
    });

    it('should use seller offer price when no promotion (second precedence)', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.resolvedPrice).toBe(45000);
      expect(result.priceSource).toBe('seller_offer');
    });

    it('should fall back to catalog default when no seller offer (lowest precedence)', () => {
      const ctx = makeContext({
        sellerOffer: null,
        catalogDefaultPrice: 50000,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.resolvedPrice).toBe(50000);
      expect(result.priceSource).toBe('catalog_default');
    });

    it('should fail when no price can be resolved at all', () => {
      const ctx = makeContext({
        sellerOffer: null,
        catalogDefaultPrice: null,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No price'))).toBe(true);
    });
  });

  // ── Step 4: Stock Check (ENH-012) ──────────────────────────────────────────

  describe('Step 4: Stock Check (ENH-012)', () => {
    it('should pass when stock is sufficient', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
        lineItem: {
          productId: 'prod-1', productName: 'Phone', productImage: null,
          variantId: null, selectedOptionIds: null, quantity: 5,
        },
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.stockSufficient).toBe(true);
      expect(result.availableStock).toBe(10);
      expect(result.stockTracked).toBe(true);
    });

    it('should fail when stock is insufficient', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 3, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
        lineItem: {
          productId: 'prod-1', productName: 'Phone', productImage: null,
          variantId: null, selectedOptionIds: null, quantity: 5,
        },
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(false);
      expect(result.stockSufficient).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient stock'))).toBe(true);
    });

    it('should not track stock when no seller offer (catalog default)', () => {
      const ctx = makeContext({
        sellerOffer: null,
        catalogDefaultPrice: 50000,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.stockTracked).toBe(false);
    });
  });

  // ── Step 5: Order Snapshot Creation ────────────────────────────────────────

  describe('Step 5: Order Snapshot Creation', () => {
    it('should produce an immutable OrderItemSnapshot when all steps pass', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
        lineItem: {
          productId: 'prod-1', productName: 'Galaxy A50', productImage: 'https://img.jpg',
          variantId: 'var-1', selectedOptionIds: null, quantity: 2,
        },
        deliveryMethod: 'express',
        shippingCost: 5000,
        estimatedDeliveryDate: '2026-11-15',
        fulfillmentLocation: 'Dar es Salaam',
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.orderItemSnapshot).not.toBeNull();

      const snap = result.orderItemSnapshot!;
      expect(snap.configuration.productId).toBe('prod-1');
      expect(snap.configuration.productName).toBe('Galaxy A50');
      expect(snap.price.unitPrice).toBe(45000);
      expect(snap.price.quantity).toBe(2);
      expect(snap.price.totalLinePrice).toBe(90000);
      expect(snap.price.sellerOfferId).toBe('offer-1');
      expect(snap.price.priceSource).toBe('seller_offer');
      expect(snap.fulfillment).not.toBeNull();
      expect(snap.fulfillment!.fulfillmentPolicy).toBe('seller_fulfilled');
      expect(snap.fulfillment!.deliveryMethod).toBe('express');
    });

    it('should not produce a snapshot when validation fails', () => {
      const ctx = makeContext({
        sellerOffer: null,
        catalogDefaultPrice: null,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(false);
      expect(result.orderItemSnapshot).toBeNull();
    });

    it('should include configuration fingerprint in snapshot for configured products', () => {
      const def = makeDefinition('active', 1);
      const dimId = def.dimensions[0].id;
      const optId = def.options[0].id;
      const ctx = makeContext({
        configurationDefinition: def,
        lineItem: {
          productId: 'prod-1', productName: 'Phone', productImage: null,
          variantId: null, selectedOptionIds: { [dimId]: [optId] }, quantity: 1,
        },
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      const snap = result.orderItemSnapshot!;
      expect(snap.configuration.configurationDefinitionVersion).toBe(1);
      expect(snap.configuration.selectedConfiguration).not.toBeNull();
      expect(snap.configuration.selectedConfiguration[dimId]).toBe('Black');
    });
  });

  // ── Promotion Edge Cases ───────────────────────────────────────────────────

  describe('Promotion Edge Cases', () => {
    it('should not use promotion when discount results in zero or negative price', () => {
      const ctx = makeContext({
        sellerOffer: {
          offerId: 'offer-1', sellerId: 'seller-1', price: 45000, currency: 'TZS',
          stockAvailable: 10, fulfillmentPolicy: 'seller_fulfilled', leadTimeDays: 2,
          condition: 'new', configurationCoverage: null,
        },
        promotionDiscount: 50000,
        promotionOriginalPrice: 45000,
      });
      const result = CheckoutTransactionBoundaryPolicy.validate(ctx);
      expect(result.valid).toBe(true);
      expect(result.priceSource).toBe('seller_offer'); // promotion rejected, fell through
      expect(result.resolvedPrice).toBe(45000);
    });
  });
});
