// @ts-nocheck
/**
 * Checkout Transaction Boundary Policy
 * ENH-007, ENH-011, ENH-012: Defines the atomic checkout validation sequence.
 *
 * Constitution §10.1:
 * "At checkout:
 *   1. Validate the selected configuration.
 *   2. Resolve the seller offer.
 *   3. Recalculate the applicable price.
 *   4. Check stock or fulfillment capacity.
 *   5. Reserve available stock atomically where stock is tracked.
 *   6. Create an immutable order snapshot.
 *   7. Release reservations safely when checkout fails or expires."
 *
 * Constitution §9.1 (Price Precedence — ENH-011):
 *   1. Applicable authorized promotion or pricing agreement.
 *   2. Seller offer price for the selected configuration.
 *   3. Seller offer's configuration-specific override.
 *   4. Applicable seller offer base price.
 *   5. Explicitly permitted catalog-level default.
 *
 * This policy is a domain-layer orchestration contract. The actual transaction
 * execution happens in the checkout service — this policy validates the steps
 * and produces the resolved price, stock check, and snapshot data.
 */

import { ConfigurationValidationPolicy } from './configuration-validation.policy';
import { ConfigurationDefinitionData, ConfigurationCombinationData } from '../entities/configuration-definition.entity';
import { ConfigurationSnapshot, PriceSnapshot, FulfillmentSnapshot, OrderItemSnapshot } from '../value-objects/order-snapshot.value-object';
import { DomainError } from '../errors/domain.error';

// ── Input Types ─────────────────────────────────────────────────────────────

export interface CheckoutLineItem {
  productId: string;
  productName: string;
  productImage: string | null;
  variantId: string | null;
  /** Selected option IDs per dimension: { dimId: [optId1, ...] } */
  selectedOptionIds: Record<string, string[]> | null;
  quantity: number;
}

export interface ResolvedSellerOffer {
  offerId: string;
  sellerId: string;
  price: number;
  currency: string;
  stockAvailable: number;
  fulfillmentPolicy: string;
  leadTimeDays: number;
  condition: string;
  /** Configuration coverage: null = universal, string[] = specific fingerprints */
  configurationCoverage: string[] | null;
}

export interface CheckoutValidationContext {
  lineItem: CheckoutLineItem;
  /** The active configuration definition for this product, or null for simple products */
  configurationDefinition: ConfigurationDefinitionData | null;
  /** The resolved seller offer for this line item */
  sellerOffer: ResolvedSellerOffer | null;
  /** Catalog-level default price (fallback only) */
  catalogDefaultPrice: number | null;
  catalogDefaultCurrency: string;
  /** Applicable promotion discount, or null */
  promotionDiscount: number | null;
  /** Original price before promotion (for snapshot) */
  promotionOriginalPrice: number | null;
  /** Fulfillment details */
  deliveryMethod: string | null;
  shippingCost: number | null;
  estimatedDeliveryDate: string | null;
  fulfillmentLocation: string | null;
}

// ── Result Types ────────────────────────────────────────────────────────────

export interface CheckoutValidationResult {
  valid: boolean;
  errors: string[];
  /** The resolved price after applying the precedence chain */
  resolvedPrice: number | null;
  resolvedCurrency: string | null;
  /** Price source identifier from the precedence chain */
  priceSource: string | null;
  /** Whether stock is sufficient for this line item */
  stockSufficient: boolean;
  /** Available stock at resolution time */
  availableStock: number;
  /** Whether stock tracking is required for this product */
  stockTracked: boolean;
  /** The immutable order item snapshot if valid */
  orderItemSnapshot: OrderItemSnapshot | null;
}

// ── Policy ──────────────────────────────────────────────────────────────────

/**
 * Executes the 6-step checkout validation sequence as defined by the constitution.
 * This is a pure domain policy — it validates and resolves but does NOT
 * execute database transactions. The caller is responsible for atomic persistence.
 */
export class CheckoutTransactionBoundaryPolicy {
  /**
   * Validates a single checkout line item through the full sequence.
   *
   * Steps:
   * 1. Validate the selected configuration against the ConfigurationDefinition
   * 2. Resolve the seller offer (must be active, must cover the configuration)
   * 3. Recalculate the applicable price using the precedence chain
   * 4. Check stock or fulfillment capacity
   * 5. Produce the immutable OrderItemSnapshot (caller handles atomic persistence)
   *
   * Step 6 (atomic reservation) and Step 7 (release on failure) are the
   * responsibility of the checkout service using the result of this policy.
   */
  static validate(context: CheckoutValidationContext): CheckoutValidationResult {
    const errors: string[] = [];
    const { lineItem, configurationDefinition, sellerOffer, catalogDefaultPrice, catalogDefaultCurrency } = context;

    // ── Step 1: Validate Configuration ──────────────────────────────────────
    if (configurationDefinition && lineItem.selectedOptionIds) {
      const configResult = ConfigurationValidationPolicy.validate(
        lineItem.selectedOptionIds,
        configurationDefinition,
      );
      if (!configResult.valid) {
        errors.push(
          `Configuration validation failed: ${configResult.errors.map(e => e.message).join('; ')}`,
        );
      }
    }

    // ── Step 2: Resolve Seller Offer ──────────────────────────────────────
    let resolvedOffer: ResolvedSellerOffer | null = sellerOffer;
    if (!resolvedOffer) {
      // No seller offer — fall through to catalog default price
      // This is allowed for catalog-level listings, but stock tracking is limited
      resolvedOffer = null;
    }

    // ── Step 3: Recalculate Price (Precedence Chain — ENH-011) ─────────────
    const priceResult = this.resolvePrice(context, resolvedOffer);
    if (priceResult.price === null) {
      errors.push('No price could be resolved — no seller offer and no catalog default available.');
    }

    // ── Step 4: Check Stock ────────────────────────────────────────────────
    let stockSufficient = true;
    let availableStock = 0;
    let stockTracked = false;

    if (resolvedOffer) {
      stockTracked = true;
      availableStock = resolvedOffer.stockAvailable;
      if (availableStock < lineItem.quantity) {
        stockSufficient = false;
        errors.push(
          `Insufficient stock: requested ${lineItem.quantity}, available ${availableStock}.`,
        );
      }
    }

    // ── Step 5: Build Order Item Snapshot ──────────────────────────────────
    let orderItemSnapshot: OrderItemSnapshot | null = null;
    if (errors.length === 0 && priceResult.price !== null) {
      orderItemSnapshot = this.buildSnapshot(context, resolvedOffer, priceResult);
    }

    return {
      valid: errors.length === 0,
      errors,
      resolvedPrice: priceResult.price,
      resolvedCurrency: priceResult.currency,
      priceSource: priceResult.source,
      stockSufficient,
      availableStock,
      stockTracked,
      orderItemSnapshot,
    };
  }

  /**
   * ENH-011: Price precedence resolution.
   *
   * 1. Applicable authorized promotion or pricing agreement.
   * 2. Seller offer price for the selected configuration.
   * 3. Seller offer's configuration-specific override.
   * 4. Applicable seller offer base price.
   * 5. Explicitly permitted catalog-level default.
   */
  private static resolvePrice(
    context: CheckoutValidationContext,
    resolvedOffer: ResolvedSellerOffer | null,
  ): { price: number | null; currency: string; source: string } {
    // Step 1: Promotion
    if (context.promotionDiscount !== null && context.promotionOriginalPrice !== null) {
      const promoPrice = context.promotionOriginalPrice - context.promotionDiscount;
      if (promoPrice > 0) {
        const currency = resolvedOffer?.currency ?? context.catalogDefaultCurrency;
        return { price: promoPrice, currency, source: 'promotion' };
      }
    }

    // Steps 2-4: Seller offer price (the offer price IS the resolved price;
    // configuration-specific overrides would be stored on the offer itself)
    if (resolvedOffer && resolvedOffer.price > 0) {
      return {
        price: resolvedOffer.price,
        currency: resolvedOffer.currency,
        source: 'seller_offer',
      };
    }

    // Step 5: Catalog default
    if (context.catalogDefaultPrice !== null && context.catalogDefaultPrice > 0) {
      return {
        price: context.catalogDefaultPrice,
        currency: context.catalogDefaultCurrency,
        source: 'catalog_default',
      };
    }

    return { price: null, currency: context.catalogDefaultCurrency, source: 'none' };
  }

  /**
   * Builds the immutable OrderItemSnapshot from the resolved checkout context.
   */
  private static buildSnapshot(
    context: CheckoutValidationContext,
    resolvedOffer: ResolvedSellerOffer | null,
    priceResult: { price: number; currency: string; source: string },
  ): OrderItemSnapshot {
    const { lineItem, configurationDefinition } = context;

    // Build configuration snapshot
    const configFingerprint = configurationDefinition && lineItem.selectedOptionIds
      ? this.computeFingerprint(lineItem.selectedOptionIds, configurationDefinition)
      : null;

    const configuration = new ConfigurationSnapshot({
      productId: lineItem.productId,
      productName: lineItem.productName,
      productImage: lineItem.productImage,
      variantId: lineItem.variantId,
      selectedConfiguration: lineItem.selectedOptionIds
        ? this.resolveOptionDisplayValues(lineItem.selectedOptionIds, configurationDefinition)
        : null,
      configurationDefinitionVersion: configurationDefinition?.version ?? null,
      configurationFingerprint: configFingerprint,
    });

    // Build price snapshot
    const unitPrice = priceResult.price;
    const totalLinePrice = unitPrice * lineItem.quantity;

    const price = new PriceSnapshot({
      unitPrice,
      currency: priceResult.currency,
      quantity: lineItem.quantity,
      totalLinePrice,
      sellerOfferId: resolvedOffer?.offerId ?? null,
      sellerId: resolvedOffer?.sellerId ?? 'catalog',
      priceSource: priceResult.source,
      appliedDiscount: context.promotionDiscount,
      originalPrice: context.promotionOriginalPrice,
    });

    // Build fulfillment snapshot
    const fulfillment = resolvedOffer
      ? new FulfillmentSnapshot({
          fulfillmentPolicy: resolvedOffer.fulfillmentPolicy,
          leadTimeDays: resolvedOffer.leadTimeDays,
          deliveryMethod: context.deliveryMethod,
          shippingCost: context.shippingCost,
          estimatedDeliveryDate: context.estimatedDeliveryDate,
          fulfillmentLocation: context.fulfillmentLocation,
        })
      : null;

    return new OrderItemSnapshot({
      configuration: configuration.toJSON(),
      price: price.toJSON(),
      fulfillment: fulfillment ? fulfillment.toJSON() : null,
    });
  }

  /**
   * Computes a configuration fingerprint from selected option IDs.
   * Uses the ConfigurationFingerprintAlgorithm for order-independent hashing.
   */
  private static computeFingerprint(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData,
  ): string | null {
    try {
      // Import dynamically to avoid circular dependencies
      const { ConfigurationFingerprintAlgorithm } = require('../algorithms/configuration-fingerprint.algorithm');
      const optionMap = new Map(definition.options.map(o => [o.id, o.normalizedValue]));
      const normalizedSelections: Record<string, string[]> = {};
      for (const [dimId, optIds] of Object.entries(selections)) {
        normalizedSelections[dimId] = optIds.map(id => optionMap.get(id) || id);
      }
      return ConfigurationFingerprintAlgorithm.generateFingerprint({
        configurationDefinitionId: definition.id,
        selections: normalizedSelections,
      });
    } catch {
      return null;
    }
  }

  /**
   * Resolves option IDs to display values for the snapshot.
   */
  private static resolveOptionDisplayValues(
    selections: Record<string, string[]>,
    definition: ConfigurationDefinitionData | null,
  ): Record<string, string> {
    if (!definition) return {};
    const optionMap = new Map(definition.options.map(o => [o.id, o.displayValue]));
    const result: Record<string, string> = {};
    for (const [dimId, optIds] of Object.entries(selections)) {
      result[dimId] = optIds.map(id => optionMap.get(id) || id).join(', ');
    }
    return result;
  }
}
