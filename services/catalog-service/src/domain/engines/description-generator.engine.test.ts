import { DescriptionGeneratorEngine } from './description-generator.engine';
import { StructuredProductAttributes } from '../value-objects/product-attributes.value-object';

describe('DescriptionGeneratorEngine', () => {
  const schema = [
    { id: '1', name: 'volume', displayLabel: 'Volume', type: 'SELECT' as const, isRequired: true },
    { id: '2', name: 'oil_type', displayLabel: 'Oil Type', type: 'SELECT' as const, isRequired: true },
    { id: '3', name: 'color', displayLabel: 'Color', type: 'TEXT' as const, isRequired: false },
  ];

  describe('generate', () => {
    it('should generate description for cooking-oil category', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Golden' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');

      expect(desc.overview).toBeDefined();
      expect(desc.keyFeatures).toBeDefined();
      expect(desc.specifications).toBeDefined();
      expect(desc.usage).toBeDefined();
      expect(desc.delivery).toBeDefined();
      expect(desc.supplierInfo).toBeDefined();
    });

    it('should include product name in overview', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.overview.toLowerCase()).toContain('cooking oil');
    });

    it('should include brand in overview', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.overview.toLowerCase()).toContain('azam');
    });

    it('should extract key features from attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Golden' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.keyFeatures.length).toBeGreaterThan(0);
    });

    it('should extract specifications from attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', capacity: '5L' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(Object.keys(desc.specifications).length).toBeGreaterThan(0);
    });

    it('should include delivery note', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.delivery).toContain('Maysar');
      expect(desc.delivery).toContain('Tanzania');
    });

    it('should include supplier info', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.supplierInfo).toContain('Azam');
    });
  });

  describe('category templates', () => {
    it('should use food-grocery template', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'food-grocery', 'Product', 'Brand');
      expect(desc.overview).toBeDefined();
    });

    it('should use default template for unknown category', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'unknown-category', 'Product', 'Brand');
      expect(desc.overview).toBeDefined();
    });
  });

  describe('content quality', () => {
    it('should generate non-empty overview', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.overview.length).toBeGreaterThan(0);
    });

    it('should limit key features to 5', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Golden' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.keyFeatures.length).toBeLessThanOrEqual(5);
    });

    it('should not include placeholder text', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.overview).not.toContain('{');
      expect(desc.overview).not.toContain('}');
    });
  });

  describe('edge cases', () => {
    it('should handle minimal attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Oil', 'Brand');
      expect(desc.overview).toBeDefined();
    });

    it('should handle special characters in product name', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Oil & Co.', 'Brand');
      expect(desc.overview).toBeDefined();
    });
  });
});
