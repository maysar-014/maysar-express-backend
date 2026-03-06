import { SeoTitleGeneratorEngine } from '../seo-title-generator.engine';

describe('SeoTitleGeneratorEngine', () => {
  describe('generate', () => {
    it('should generate title with all components', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible Oil',
      });
      expect(title).toContain('Azam');
      expect(title).toContain('Cooking Oil');
      expect(title).toContain('5L');
      expect(title).toContain('Edible Oil');
    });

    it('should not exceed 70 characters', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'VeryLongBrandNameThatIsQuiteLengthy',
        productName: 'VeryLongProductNameThatIsQuiteLengthy',
        keyAttribute: 'VeryLongKeyAttributeThatIsQuiteLengthy',
        categoryKeyword: 'VeryLongCategoryKeywordThatIsQuiteLengthy',
      });
      expect(title.length).toBeLessThanOrEqual(70);
    });

    it('should handle empty components', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '',
        categoryKeyword: '',
      });
      expect(title).toBeDefined();
      expect(title.length).toBeGreaterThan(0);
    });

    it('should handle all empty components', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: '',
        productName: '',
        keyAttribute: '',
        categoryKeyword: '',
      });
      expect(title).toBeDefined();
    });

    it('should create readable title', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Samsung',
        productName: 'Galaxy Phone',
        keyAttribute: '5G',
        categoryKeyword: 'Smartphone',
      });
      expect(title).toMatch(/[A-Za-z0-9\s\-–—&.,()]+/);
    });
  });

  describe('validate', () => {
    it('should validate correct title', () => {
      const result = SeoTitleGeneratorEngine.validate('Azam Cooking Oil 5L – Premium');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title too short', () => {
      const result = SeoTitleGeneratorEngine.validate('Oil');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject title too long', () => {
      const longTitle = 'a'.repeat(71);
      const result = SeoTitleGeneratorEngine.validate(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject title with invalid characters', () => {
      const result = SeoTitleGeneratorEngine.validate('Azam Oil @#$%^&*()');
      expect(result.isValid).toBe(false);
    });

    it('should accept title at min length', () => {
      const title = 'a'.repeat(30);
      const result = SeoTitleGeneratorEngine.validate(title);
      expect(result.isValid).toBe(true);
    });

    it('should accept title at max length', () => {
      const title = 'a'.repeat(70);
      const result = SeoTitleGeneratorEngine.validate(title);
      expect(result.isValid).toBe(true);
    });
  });

  describe('getOptimalLength', () => {
    it('should return 70', () => {
      expect(SeoTitleGeneratorEngine.getOptimalLength()).toBe(70);
    });
  });

  describe('getRecommendedLength', () => {
    it('should return value between min and max', () => {
      const recommended = SeoTitleGeneratorEngine.getRecommendedLength();
      expect(recommended).toBeGreaterThan(30);
      expect(recommended).toBeLessThan(70);
    });
  });

  describe('truncation', () => {
    it('should truncate at word boundary', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'VeryLongBrandName',
        productName: 'VeryLongProductNameThatIsQuiteLengthy',
        keyAttribute: 'VeryLongKeyAttribute',
        categoryKeyword: 'VeryLongCategoryKeyword',
      });
      expect(title.length).toBeLessThanOrEqual(70);
      expect(title).not.toEndWith('-');
    });

    it('should not truncate short titles', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible',
      });
      expect(title.length).toBeLessThanOrEqual(70);
    });
  });

  describe('expansion', () => {
    it('should expand very short titles', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'A',
        productName: 'B',
        keyAttribute: '',
        categoryKeyword: '',
      });
      expect(title.length).toBeGreaterThanOrEqual(30);
    });
  });

  describe('SEO optimization', () => {
    it('should include brand first', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible',
      });
      expect(title.indexOf('Azam')).toBeLessThan(title.indexOf('Oil'));
    });

    it('should include product name before category', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible Oil',
      });
      const oilIndex = title.toLowerCase().indexOf('cooking oil');
      const editableIndex = title.toLowerCase().indexOf('edible oil');
      if (oilIndex !== -1 && editableIndex !== -1) {
        expect(oilIndex).toBeLessThan(editableIndex);
      }
    });

    it('should be readable and natural', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Samsung',
        productName: 'Galaxy S21',
        keyAttribute: '5G',
        categoryKeyword: 'Smartphone',
      });
      expect(title).toMatch(/^[A-Z]/);
      expect(title).not.toContain('  ');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in input', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azam & Co.',
        productName: 'Oil (Premium)',
        keyAttribute: '5L-Plus',
        categoryKeyword: 'Edible Oil',
      });
      expect(title).toBeDefined();
    });

    it('should handle numbers in input', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Brand123',
        productName: 'Product456',
        keyAttribute: '5L',
        categoryKeyword: 'Category789',
      });
      expect(title).toContain('123');
      expect(title).toContain('456');
      expect(title).toContain('5L');
    });

    it('should handle unicode characters', () => {
      const title = SeoTitleGeneratorEngine.generate({
        brand: 'Azám',
        productName: 'Óil',
        keyAttribute: '5L',
        categoryKeyword: 'Édible',
      });
      expect(title).toBeDefined();
    });

    it('should handle very long single word', () => {
      const longWord = 'a'.repeat(50);
      const title = SeoTitleGeneratorEngine.generate({
        brand: longWord,
        productName: 'Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible',
      });
      expect(title.length).toBeLessThanOrEqual(70);
    });
  });

  describe('consistency', () => {
    it('should generate same title for same input', () => {
      const input = {
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible Oil',
      };
      const title1 = SeoTitleGeneratorEngine.generate(input);
      const title2 = SeoTitleGeneratorEngine.generate(input);
      expect(title1).toBe(title2);
    });

    it('should generate different titles for different inputs', () => {
      const title1 = SeoTitleGeneratorEngine.generate({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        categoryKeyword: 'Edible',
      });
      const title2 = SeoTitleGeneratorEngine.generate({
        brand: 'Sunflower',
        productName: 'Oil',
        keyAttribute: '10L',
        categoryKeyword: 'Cooking',
      });
      expect(title1).not.toBe(title2);
    });
  });
});
