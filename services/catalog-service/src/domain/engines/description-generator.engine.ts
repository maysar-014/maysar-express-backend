/**
 * Description Generator Engine
 * Pure, stateless engine for generating structured product descriptions
 */

import { StructuredProductAttributes } from '../value-objects/product-attributes.value-object';

export interface GeneratedProductDescription {
  overview: string;
  keyFeatures: string[];
  specifications: Record<string, string>;
  usage: string;
  delivery: string;
  supplierInfo: string;
}

export interface CategoryDescriptionTemplate {
  categorySlug: string;
  sections: string[]; // e.g., ['overview', 'features', 'specs', 'usage', 'delivery']
  overviewTemplate: string;
  featuresTemplate: string;
  specificationsTemplate: string;
  usageTemplate: string;
  deliveryTemplate: string;
}

export class DescriptionGeneratorEngine {
  private static readonly TEMPLATES: Record<string, CategoryDescriptionTemplate> = {
    'food-grocery': {
      categorySlug: 'food-grocery',
      sections: ['overview', 'ingredients', 'shelf-life', 'storage', 'delivery'],
      overviewTemplate: '{product_name} is a premium {category} offered by {brand}. This product comes in {packaging} and is suitable for {usage}.',
      featuresTemplate: 'Key ingredients and features include {features}.',
      specificationsTemplate: 'Shelf life: {shelf_life}, Storage: {storage_conditions}',
      usageTemplate: 'Best used for {usage_context}.',
      deliveryTemplate: 'Available from verified suppliers on Maysar marketplace across Tanzania.',
    },
    'electronics': {
      categorySlug: 'electronics',
      sections: ['overview', 'features', 'specs', 'warranty', 'packaging'],
      overviewTemplate: '{product_name} is a premium {category} offered by {brand}. This device features {key_features}.',
      featuresTemplate: 'Key features: {features}',
      specificationsTemplate: 'Technical specifications: {specifications}',
      usageTemplate: 'Ideal for {usage_context}.',
      deliveryTemplate: 'Available from verified suppliers on Maysar marketplace across Tanzania.',
    },
    'construction-materials': {
      categorySlug: 'construction-materials',
      sections: ['overview', 'material-type', 'grade', 'usage', 'packaging'],
      overviewTemplate: '{product_name} is a premium {category} offered by {brand}. Material type: {material_type}.',
      featuresTemplate: 'Grade: {grade}, Quality: {quality}',
      specificationsTemplate: 'Specifications: {specifications}',
      usageTemplate: 'Suitable for {usage_context}.',
      deliveryTemplate: 'Available from verified suppliers on Maysar marketplace across Tanzania.',
    },
    'cooking-oil': {
      categorySlug: 'cooking-oil',
      sections: ['overview', 'features', 'specs', 'usage', 'delivery'],
      overviewTemplate: '{product_name} is a premium {category} offered by {brand}. Volume: {volume}.',
      featuresTemplate: 'Key features: {features}',
      specificationsTemplate: 'Specifications: {specifications}',
      usageTemplate: 'Perfect for {usage_context}.',
      deliveryTemplate: 'Available from verified suppliers on Maysar marketplace across Tanzania.',
    },
    '_default': {
      categorySlug: '_default',
      sections: ['overview', 'features', 'specs', 'usage', 'packaging', 'delivery'],
      overviewTemplate: '{product_name} is a premium {category} offered by {brand}.',
      featuresTemplate: 'Key features: {features}',
      specificationsTemplate: 'Specifications: {specifications}',
      usageTemplate: 'Suitable for {usage_context}.',
      deliveryTemplate: 'Available from verified suppliers on Maysar marketplace across Tanzania.',
    },
  };

  static generate(
    attributes: StructuredProductAttributes,
    categorySlug: string,
    productName: string,
    brand: string
  ): GeneratedProductDescription {
    const template = this.TEMPLATES[categorySlug] || this.TEMPLATES['_default'];
    const attrs = attributes.getAll();

    const overview = this.interpolate(template.overviewTemplate, {
      product_name: productName,
      brand,
      category: categorySlug.replace(/-/g, ' '),
      packaging: attrs['packaging'] || 'standard packaging',
      usage: attrs['usage'] || 'general use',
      key_features: attrs['key_features'] || 'premium quality',
      material_type: attrs['material_type'] || 'standard',
      volume: attrs['volume'] || 'standard size',
    });

    const keyFeatures = this.extractKeyFeatures(attrs);

    const specifications = this.extractSpecifications(attrs);

    const usage = this.interpolate(template.usageTemplate, {
      usage_context: attrs['usage_context'] || 'general purposes',
    });

    const delivery = template.deliveryTemplate;

    const supplierInfo = `Supplier: ${brand}. Location: ${attrs['supplier_location'] || 'Tanzania'}. Quality assured and verified on Maysar marketplace.`;

    return {
      overview,
      keyFeatures,
      specifications,
      usage,
      delivery,
      supplierInfo,
    };
  }

  private static extractKeyFeatures(attrs: Record<string, string>): string[] {
    const features: string[] = [];

    // Extract common feature attributes
    const featureKeys = ['color', 'size', 'material', 'brand', 'warranty', 'certification'];
    for (const key of featureKeys) {
      if (attrs[key]) {
        features.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${attrs[key]}`);
      }
    }

    // If no features found, create from available attributes
    if (features.length === 0) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value && !['supplier_location', 'packaging', 'usage', 'usage_context'].includes(key)) {
          features.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
        }
      }
    }

    return features.slice(0, 5); // Limit to 5 features
  }

  private static extractSpecifications(attrs: Record<string, string>): Record<string, string> {
    const specs: Record<string, string> = {};

    const specKeys = ['weight', 'dimensions', 'capacity', 'power', 'warranty', 'certification', 'grade', 'quality'];
    for (const key of specKeys) {
      if (attrs[key]) {
        specs[key] = attrs[key];
      }
    }

    return specs;
  }

  private static interpolate(template: string, values: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    // Remove any remaining placeholders
    result = result.replace(/{[^}]+}/g, '');
    return result.trim();
  }
}
