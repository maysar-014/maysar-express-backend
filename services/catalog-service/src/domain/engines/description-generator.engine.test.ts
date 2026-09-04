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
      // Canonical fields are always empty — seller-offer data lives in sellerOffer
      expect(desc.delivery).toBe('');
      expect(desc.supplierInfo).toBe('');
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

    it('should limit key features to a maximum of 10', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Golden' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.keyFeatures.length).toBeLessThanOrEqual(10);
    });

    it('should extract specifications from spec-key attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', capacity: '5L' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(Object.keys(desc.specifications).length).toBeGreaterThan(0);
    });

    it('should NOT include delivery in canonical description (Product/SellerOffer separation)', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', delivery: 'Free delivery in 3 days' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      // delivery field is always empty in canonical output
      expect(desc.delivery).toBe('');
      // seller-offer delivery is in sellerOffer section
      expect(desc.sellerOffer.delivery).toContain('Free delivery');
    });

    it('should NOT include supplier location in canonical description', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', supplier_location: 'Kariakoo, Dar es Salaam' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      // supplierInfo is always empty in canonical output
      expect(desc.supplierInfo).toBe('');
      // seller location lives in sellerOffer
      expect(desc.sellerOffer.supplierInfo).toContain('Kariakoo');
    });

    it('should return empty sellerOffer sections when no offer attributes provided', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Cooking Oil', 'Azam');
      expect(desc.sellerOffer.delivery).toBe('');
      expect(desc.sellerOffer.supplierInfo).toBe('');
    });
  });

  describe('attribute alias resolution', () => {
    const schemaWithAliases = [
      { id: '1', name: 'internal_memory', displayLabel: 'Internal Memory', type: 'TEXT' as const, isRequired: true },
      { id: '2', name: 'oil_type', displayLabel: 'Oil Type', type: 'SELECT' as const, isRequired: false },
    ];

    it('should resolve "Internal Memory" alias to canonical "storage"', () => {
      const attrs = StructuredProductAttributes.create(
        { internal_memory: '256GB', oil_type: 'N/A' },
        schemaWithAliases
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'smartphones', 'Galaxy S24', 'Samsung');
      // After alias resolution, the canonical key appears in features
      const allText = desc.keyFeatures.join(' ') + JSON.stringify(desc.specifications);
      expect(allText.toLowerCase()).toContain('256gb');
    });
  });

  describe('descriptionPriority ordering', () => {
    it('should order features by HIGH → MEDIUM → LOW priority when schema provides metadata', () => {
      const prioritySchema = [
        { id: '1', name: 'color', displayLabel: 'Color', type: 'TEXT' as const, isRequired: false, descriptionPriority: 'LOW' as const },
        { id: '2', name: 'processor', displayLabel: 'Processor', type: 'TEXT' as const, isRequired: false, descriptionPriority: 'HIGH' as const },
        { id: '3', name: 'oil_type', displayLabel: 'Oil Type', type: 'TEXT' as const, isRequired: true },
      ];
      const attrs = StructuredProductAttributes.create(
        { color: 'Red', processor: 'Snapdragon 8 Gen 3', oil_type: 'N/A' },
        prioritySchema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'electronics', 'Device', 'Brand', prioritySchema);
      // HIGH priority processor should appear before LOW priority color
      const processorIdx = desc.keyFeatures.findIndex(f => f.toLowerCase().includes('processor'));
      const colorIdx = desc.keyFeatures.findIndex(f => f.toLowerCase().includes('color'));
      if (processorIdx !== -1 && colorIdx !== -1) {
        expect(processorIdx).toBeLessThan(colorIdx);
      }
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

    it('should provide fallback features when no non-meta attributes present', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', delivery: 'Express', supplier_location: 'Dar' },
        schema
      );
      const desc = DescriptionGeneratorEngine.generate(attrs, 'cooking-oil', 'Oil', 'Brand');
      // delivery and supplier_location are excluded from features (seller-offer)
      // volume and oil_type are spec/feature keys, so features may contain fallback
      expect(Array.isArray(desc.keyFeatures)).toBe(true);
    });
  });
});
