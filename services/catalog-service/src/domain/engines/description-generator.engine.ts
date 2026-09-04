/**
 * Evidence-based product description generator.
 *
 * Core principles:
 *  - Only states facts explicitly supplied by the seller or category schema.
 *  - Canonical product content (overview, features, specs) never contains
 *    seller-specific offer data (price, location, delivery, COD).
 *  - Seller-offer data is returned in a separate `sellerOffer` section so
 *    callers can choose to display it alongside the product, not inside it.
 *  - Attributes are normalised and alias-resolved before use so that
 *    "Internal Memory" and "ROM" are treated as the same concept.
 *  - Content ordering respects `descriptionPriority` metadata on the schema.
 */
import { StructuredProductAttributes, CategoryAttributeSchema, AttributePriority } from '../value-objects/product-attributes.value-object';
import { AttributeAliasResolver } from './attribute-alias-resolver';
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';

export interface GeneratedProductDescription {
  overview: string;
  keyFeatures: string[];
  specifications: Record<string, string>;
  usage: string;
  /** @deprecated Delivery info is seller-offer data — use `sellerOffer.delivery` instead.
   *  Retained as empty string for backward-compatibility with callers that expect the field. */
  delivery: string;
  /** @deprecated Supplier info is seller-offer data — use `sellerOffer.supplierInfo` instead.
   *  Retained as empty string for backward-compatibility. */
  supplierInfo: string;
  /** Seller-specific offer data that must NOT appear in the canonical product description. */
  sellerOffer: {
    delivery: string;
    supplierInfo: string;
  };
}

export interface CategoryDescriptionTemplate {
  categorySlug: string;
  sections: string[];
  overviewTemplate: string;
  featuresTemplate: string;
  specificationsTemplate: string;
  usageTemplate: string;
  deliveryTemplate: string;
}

/** Keys that belong to the seller offer, not the canonical product. */
const SELLER_OFFER_KEYS = new Set([
  'supplier_location', 'location', 'delivery', 'delivery_terms', 'shipping',
]);

/** Keys treated as usage context — appear in their own section. */
const USAGE_KEYS = ['usage_context', 'usage', 'application', 'recommended_use'];

/** Keys promoted to the specifications section regardless of schema metadata. */
const SPEC_KEYS = new Set([
  'weight', 'net_weight', 'dimensions', 'capacity', 'power', 'warranty',
  'certification', 'grade', 'quality', 'volume', 'net_volume', 'pack_size',
  'packaging', 'packaging_type', 'shelf_life', 'storage_conditions', 'expiry_date',
]);

export class DescriptionGeneratorEngine {
  static generate(
    attributes: StructuredProductAttributes,
    categorySlug: string,
    productName: string,
    brand: string,
    schema?: CategoryAttributeSchema[],
  ): GeneratedProductDescription {
    // 1. Resolve aliases and normalize all attribute values
    const rawAttrs = attributes.getAll();
    const resolvedRaw = AttributeAliasResolver.resolveAll(rawAttrs);
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(resolvedRaw)) {
      const normalised = NormalizationAlgorithm.normalizeByAttributeKey(key, value);
      if (normalised.trim()) attrs[key] = normalised.trim();
    }

    // 2. Separate canonical product attributes from seller-offer attributes
    const offerAttrs: Record<string, string> = {};
    const productAttrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (SELLER_OFFER_KEYS.has(key)) {
        offerAttrs[key] = value;
      } else {
        productAttrs[key] = value;
      }
    }

    // 3. Build content sections
    const category = this.readableCategory(categorySlug);
    const identity = [productName.trim(), brand.trim()].filter(Boolean).join(' by ');
    const overview = identity
      ? `${identity} is listed in ${category}. This listing is prepared from the seller-provided product information so buyers can compare the item with clear, factual details.`
      : `This product is listed in ${category}. The listing is prepared from the seller-provided product information so buyers can compare the item with clear, factual details.`;

    const keyFeatures = this.extractKeyFeatures(productAttrs, schema);
    const specifications = this.extractSpecifications(productAttrs, schema);
    const usageValue = this.firstValue(productAttrs, USAGE_KEYS);

    // 4. Seller-offer data — kept separate from canonical content
    const deliveryValue = this.firstValue(offerAttrs, ['delivery', 'delivery_terms', 'shipping']);
    const locationValue = this.firstValue(offerAttrs, ['supplier_location', 'location']);

    return {
      overview,
      keyFeatures,
      specifications,
      usage: usageValue ? `Use: ${usageValue}.` : '',
      // Backward-compat: these fields now always empty in the canonical description
      delivery: '',
      supplierInfo: '',
      sellerOffer: {
        delivery: deliveryValue ? `Delivery: ${deliveryValue}.` : '',
        supplierInfo: locationValue ? `Supplier location: ${locationValue}.` : '',
      },
    };
  }

  private static extractKeyFeatures(
    attrs: Record<string, string>,
    schema?: CategoryAttributeSchema[],
  ): string[] {
    // Attributes explicitly excluded from features (handled elsewhere)
    const excludedKeys = new Set([...SELLER_OFFER_KEYS, ...USAGE_KEYS, ...SPEC_KEYS]);

    const entries = Object.entries(attrs).filter(([key]) => !excludedKeys.has(key));

    if (schema && schema.length > 0) {
      // Sort by descriptionPriority: HIGH → MEDIUM → LOW → undefined
      const priorityOrder: Record<AttributePriority | 'undefined', number> = {
        HIGH: 0, MEDIUM: 1, LOW: 2, undefined: 3,
      };
      const schemaMap = new Map(schema.map(s => [
        AttributeAliasResolver.resolve(s.name), s,
      ]));

      entries.sort(([aKey], [bKey]) => {
        const aMeta = schemaMap.get(aKey);
        const bMeta = schemaMap.get(bKey);
        const aPriority = (aMeta?.descriptionPriority ?? 'undefined') as AttributePriority | 'undefined';
        const bPriority = (bMeta?.descriptionPriority ?? 'undefined') as AttributePriority | 'undefined';
        return priorityOrder[aPriority] - priorityOrder[bPriority];
      });
    }

    const features = entries
      .slice(0, 10)
      .map(([key, value]) => `${this.readableKey(key)}: ${value}`);

    return features.length > 0
      ? features
      : ['Product details are based on information provided by the seller'];
  }

  private static extractSpecifications(
    attrs: Record<string, string>,
    schema?: CategoryAttributeSchema[],
  ): Record<string, string> {
    const specs: Record<string, string> = {};

    // Add attributes that match the hard-coded spec key list
    for (const key of SPEC_KEYS) {
      if (attrs[key]) specs[this.readableKey(key)] = attrs[key];
    }

    // Also include schema-annotated HIGH/MEDIUM priority attributes not already captured
    if (schema) {
      for (const s of schema) {
        const canonical = AttributeAliasResolver.resolve(s.name);
        if (
          (s.descriptionPriority === 'HIGH' || s.descriptionPriority === 'MEDIUM') &&
          attrs[canonical] &&
          !specs[this.readableKey(canonical)]
        ) {
          specs[this.readableKey(canonical)] = attrs[canonical];
        }
      }
    }

    return specs;
  }

  private static firstValue(attrs: Record<string, string>, keys: string[]): string {
    return keys.map((key) => attrs[key]).find(Boolean) || '';
  }

  private static readableCategory(categorySlug: string): string {
    return categorySlug.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private static readableKey(key: string): string {
    return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
