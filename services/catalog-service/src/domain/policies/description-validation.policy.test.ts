import { DescriptionValidationPolicy } from './description-validation.policy';

describe('DescriptionValidationPolicy', () => {
  describe('validate', () => {
    it('should validate correct description', () => {
      const result = DescriptionValidationPolicy.validate(
        'This is a premium Cooking Oil product with excellent specifications and features. It is ideal for cooking, frying, and everyday kitchen use, with reliable quality, stable performance, and detailed warranty information.',
        'Cooking Oil',
        ['cooking', 'oil', 'edible']
      );
      expect(result.isValid).toBe(true);
      expect(result.violatedRules).toHaveLength(0);
    });

    it('should reject description too short', () => {
      const result = DescriptionValidationPolicy.validate(
        'Short',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.length).toBeGreaterThan(0);
    });

    it('should reject description too long', () => {
      const longDesc = 'a'.repeat(5001);
      const result = DescriptionValidationPolicy.validate(
        longDesc,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.length).toBeGreaterThan(0);
    });

    it('should reject description without product name', () => {
      const result = DescriptionValidationPolicy.validate(
        'This is a premium edible liquid with excellent specifications and features. It is ideal for frying, cooking, and everyday kitchen use, with reliable quality, stable performance, and detailed warranty information.',
        'Extra Virgin Olive Oil',
        ['edible', 'liquid']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.some((r: string) => r.includes('product name'))).toBe(true);
    });

    it('should reject description without category keyword', () => {
      const result = DescriptionValidationPolicy.validate(
        'This is a premium Cooking Oil product with excellent specifications and features. Perfect for cooking and frying.',
        'Cooking Oil',
        ['electronics', 'gadget']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.some((r: string) => r.includes('keyword'))).toBe(true);
    });

    it('should reject description without specifications', () => {
      const result = DescriptionValidationPolicy.validate(
        'This is a premium Cooking Oil product. Perfect for cooking and frying. Great quality and taste.',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.some((r: string) => r.includes('specification'))).toBe(true);
    });

    it('should reject description with excessive repetition', () => {
      const repeated = 'premium '.repeat(10) + 'Cooking Oil with premium quality and premium features';
      const result = DescriptionValidationPolicy.validate(
        repeated,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(false);
      expect(result.violatedRules.some((r: string) => r.includes('repetition'))).toBe(true);
    });
  });

  describe('minimum length validation', () => {
    it('should accept description at minimum length', () => {
      const minDesc = 'a'.repeat(120) + ' Cooking Oil with specifications and features';
      const result = DescriptionValidationPolicy.validate(
        minDesc,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('120'))).toBe(false);
    });

    it('should reject description below minimum', () => {
      const result = DescriptionValidationPolicy.validate(
        'a'.repeat(119),
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('120'))).toBe(true);
    });
  });

  describe('maximum length validation', () => {
    it('should accept description at maximum length', () => {
      const maxDesc = 'Cooking Oil with excellent specifications and features for edible use. '.padEnd(5000, 'a');
      const result = DescriptionValidationPolicy.validate(
        maxDesc,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('5000'))).toBe(false);
    });

    it('should reject description above maximum', () => {
      const result = DescriptionValidationPolicy.validate(
        'a'.repeat(5001),
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('5000'))).toBe(true);
    });
  });

  describe('product name validation', () => {
    it('should find product name in description', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with excellent quality and specifications for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('product name'))).toBe(false);
    });

    it('should find partial product name', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking product with excellent quality and specifications for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('product name'))).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium COOKING OIL with excellent quality and specifications for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('product name'))).toBe(false);
    });
  });

  describe('category keyword validation', () => {
    it('should find category keyword', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with excellent quality and specifications for cooking',
        'Cooking Oil',
        ['cooking', 'oil', 'edible']
      );
      expect(result.violatedRules.some((r: string) => r.includes('keyword'))).toBe(false);
    });

    it('should be case insensitive for keywords', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking OIL with excellent quality and specifications',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('keyword'))).toBe(false);
    });

    it('should accept any keyword from list', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium edible product with excellent quality and specifications for cooking',
        'Cooking Oil',
        ['cooking', 'oil', 'edible']
      );
      expect(result.violatedRules.some((r: string) => r.includes('keyword'))).toBe(false);
    });
  });

  describe('specifications validation', () => {
    it('should find specification keywords', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with specifications including volume, type, and quality for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('specification'))).toBe(false);
    });

    it('should accept various specification keywords', () => {
      const keywords = ['specification', 'feature', 'technical', 'dimension', 'weight', 'material', 'color', 'size', 'capacity', 'warranty'];
      keywords.forEach(keyword => {
        const desc = `Premium Cooking Oil with ${keyword} details for cooking`;
        const result = DescriptionValidationPolicy.validate(
          desc,
          'Cooking Oil',
          ['cooking', 'oil']
        );
        expect(result.violatedRules.some((r: string) => r.includes('specification'))).toBe(false);
      });
    });
  });

  describe('repetition validation', () => {
    it('should detect excessive word repetition', () => {
      const repeated = 'premium '.repeat(6) + 'Cooking Oil with specifications';
      const result = DescriptionValidationPolicy.validate(
        repeated,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('repetition'))).toBe(true);
    });

    it('should allow normal word usage', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with premium quality and premium features for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('repetition'))).toBe(false);
    });

    it('should ignore short words', () => {
      const repeated = 'the the the the the the Cooking Oil with specifications for cooking';
      const result = DescriptionValidationPolicy.validate(
        repeated,
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.violatedRules.some((r: string) => r.includes('repetition'))).toBe(false);
    });
  });

  describe('suggestions', () => {
    it('should suggest adding product name', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium edible liquid with excellent quality and specifications for kitchen use. It is designed for frying, cooking, and everyday preparation, with reliable quality and detailed warranty information.',
        'Extra Virgin Olive Oil',
        ['edible', 'liquid']
      );
      expect(result.suggestions.some((s: string) => s.includes('Extra Virgin Olive Oil'))).toBe(true);
    });

    it('should suggest adding keywords', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with excellent quality and specifications',
        'Cooking Oil',
        ['electronics', 'gadget']
      );
      expect(result.suggestions.some((s: string) => s.includes('keyword'))).toBe(true);
    });

    it('should suggest adding specifications', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil with excellent quality for cooking',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.suggestions.some((s: string) => s.includes('specification'))).toBe(true);
    });
  });

  describe('getMinimumLength', () => {
    it('should return 120', () => {
      expect(DescriptionValidationPolicy.getMinimumLength()).toBe(120);
    });
  });

  describe('getMaximumLength', () => {
    it('should return 5000', () => {
      expect(DescriptionValidationPolicy.getMaximumLength()).toBe(5000);
    });
  });

  describe('getRecommendedLength', () => {
    it('should return value between min and max', () => {
      const recommended = DescriptionValidationPolicy.getRecommendedLength();
      expect(recommended).toBeGreaterThan(120);
      expect(recommended).toBeLessThan(5000);
    });
  });

  describe('edge cases', () => {
    it('should handle empty description', () => {
      const result = DescriptionValidationPolicy.validate('', 'Cooking Oil', ['cooking', 'oil']);
      expect(result.isValid).toBe(false);
    });

    it('should handle special characters', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Oil & Co. with excellent quality (100%) and specifications for cooking! This formulation is designed for daily kitchen use and includes durable packaging, clear instructions, and warranty details.',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium Cooking Óil with excellent quality and specifications for cooking. It is built for everyday kitchen use, includes clear dimensions, and comes with warranty details.',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple spaces', () => {
      const result = DescriptionValidationPolicy.validate(
        'Premium  Cooking   Oil    with excellent quality and specifications for cooking. This product is ideal for frying, includes detailed specifications, and offers dependable performance.',
        'Cooking Oil',
        ['cooking', 'oil']
      );
      expect(result.isValid).toBe(true);
    });
  });
});
