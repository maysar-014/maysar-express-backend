import { SeoSlug, SeoSlugInput } from '../seo-slug.value-object';

describe('SeoSlug', () => {
  const validInput: SeoSlugInput = {
    categorySlug: 'cooking-oil',
    brand: 'Azam',
    productName: 'Cooking Oil',
    keyAttribute: '5L',
  };

  describe('fromAttributes', () => {
    it('should generate slug from attributes', () => {
      const slug = SeoSlug.fromAttributes(validInput);
      expect(slug.getValue()).toContain('cooking-oil');
      expect(slug.getValue()).toContain('azam');
      expect(slug.getValue()).toContain('5l');
    });

    it('should lowercase all parts', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        brand: 'AZAM',
        productName: 'COOKING OIL',
      });
      expect(slug.getValue()).not.toContain('AZAM');
      expect(slug.getValue()).not.toContain('COOKING');
    });

    it('should replace spaces with hyphens', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        productName: 'Cooking Oil Premium',
      });
      expect(slug.getValue()).toContain('cooking-oil-premium');
    });

    it('should remove special characters', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        brand: 'Azam@#$',
        productName: 'Oil&Co',
      });
      const value = slug.getValue();
      expect(value).not.toContain('@');
      expect(value).not.toContain('#');
      expect(value).not.toContain('&');
    });

    it('should handle empty attributes', () => {
      const slug = SeoSlug.fromAttributes({
        categorySlug: 'cooking-oil',
        brand: '',
        productName: '',
        keyAttribute: '',
      });
      expect(slug.getValue()).toBe('cooking-oil');
    });

    it('should not exceed max length', () => {
      const slug = SeoSlug.fromAttributes({
        categorySlug: 'very-long-category-name-that-is-quite-lengthy',
        brand: 'VeryLongBrandNameThatIsQuiteLengthy',
        productName: 'VeryLongProductNameThatIsQuiteLengthy',
        keyAttribute: 'VeryLongKeyAttributeThatIsQuiteLengthy',
      });
      expect(slug.getLength()).toBeLessThanOrEqual(300);
    });
  });

  describe('fromString', () => {
    it('should create from valid string', () => {
      const slug = SeoSlug.fromString('cooking-oil-azam-5l');
      expect(slug.getValue()).toBe('cooking-oil-azam-5l');
    });

    it('should throw on invalid characters', () => {
      expect(() => SeoSlug.fromString('cooking-oil@azam')).toThrow();
    });

    it('should throw on leading hyphen', () => {
      expect(() => SeoSlug.fromString('-cooking-oil')).toThrow();
    });

    it('should throw on trailing hyphen', () => {
      expect(() => SeoSlug.fromString('cooking-oil-')).toThrow();
    });

    it('should throw on exceeding max length', () => {
      const longSlug = 'a'.repeat(301);
      expect(() => SeoSlug.fromString(longSlug)).toThrow();
    });
  });

  describe('getValue', () => {
    it('should return slug string', () => {
      const slug = SeoSlug.fromAttributes(validInput);
      expect(typeof slug.getValue()).toBe('string');
    });
  });

  describe('getLength', () => {
    it('should return slug length', () => {
      const slug = SeoSlug.fromString('cooking-oil-azam-5l');
      expect(slug.getLength()).toBe(19);
    });
  });

  describe('getSegments', () => {
    it('should split slug into segments', () => {
      const slug = SeoSlug.fromString('cooking-oil-azam-5l');
      const segments = slug.getSegments();
      expect(segments).toEqual(['cooking', 'oil', 'azam', '5l']);
    });

    it('should handle single segment', () => {
      const slug = SeoSlug.fromString('cooking');
      expect(slug.getSegments()).toEqual(['cooking']);
    });
  });

  describe('isValid', () => {
    it('should return true for valid slug', () => {
      const slug = SeoSlug.fromString('cooking-oil-azam-5l');
      expect(slug.isValid()).toBe(true);
    });

    it('should return false for empty slug', () => {
      expect(() => SeoSlug.fromString('')).toThrow();
    });

    it('should return false for uppercase', () => {
      expect(() => SeoSlug.fromString('Cooking-Oil')).toThrow();
    });
  });

  describe('toString', () => {
    it('should return slug string', () => {
      const slug = SeoSlug.fromString('cooking-oil-azam-5l');
      expect(slug.toString()).toBe('cooking-oil-azam-5l');
    });
  });

  describe('equals', () => {
    it('should return true for equal slugs', () => {
      const slug1 = SeoSlug.fromString('cooking-oil-azam-5l');
      const slug2 = SeoSlug.fromString('cooking-oil-azam-5l');
      expect(slug1.equals(slug2)).toBe(true);
    });

    it('should return false for different slugs', () => {
      const slug1 = SeoSlug.fromString('cooking-oil-azam-5l');
      const slug2 = SeoSlug.fromString('cooking-oil-azam-10l');
      expect(slug1.equals(slug2)).toBe(false);
    });
  });

  describe('normalization', () => {
    it('should handle multiple spaces', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        productName: 'Cooking   Oil   Premium',
      });
      expect(slug.getValue()).not.toContain('---');
    });

    it('should handle mixed case', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        brand: 'AzAm',
        productName: 'CoOkInG oIL',
      });
      const value = slug.getValue();
      expect(value).toBe(value.toLowerCase());
    });

    it('should handle numbers', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        keyAttribute: '5L Premium 2024',
      });
      expect(slug.getValue()).toContain('5l');
      expect(slug.getValue()).toContain('2024');
    });

    it('should handle unicode characters', () => {
      const slug = SeoSlug.fromAttributes({
        ...validInput,
        brand: 'Azám',
      });
      expect(slug.getValue()).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very short slug', () => {
      const slug = SeoSlug.fromString('a');
      expect(slug.isValid()).toBe(true);
    });

    it('should handle max length slug', () => {
      const maxSlug = 'a'.repeat(300);
      const slug = SeoSlug.fromString(maxSlug);
      expect(slug.getLength()).toBe(300);
    });

    it('should handle slug with numbers only', () => {
      const slug = SeoSlug.fromString('123-456-789');
      expect(slug.isValid()).toBe(true);
    });

    it('should handle slug with hyphens only', () => {
      expect(() => SeoSlug.fromString('---')).toThrow();
    });

    it('should filter empty segments', () => {
      const slug = SeoSlug.fromAttributes({
        categorySlug: 'cooking-oil',
        brand: '',
        productName: 'Oil',
        keyAttribute: '',
      });
      expect(slug.getValue()).toContain('cooking-oil');
      expect(slug.getValue()).toContain('oil');
    });
  });

  describe('SEO optimization', () => {
    it('should create readable slug', () => {
      const slug = SeoSlug.fromAttributes(validInput);
      const value = slug.getValue();
      expect(value.split('-').length).toBeGreaterThan(1);
    });

    it('should preserve keyword order', () => {
      const slug = SeoSlug.fromAttributes({
        categorySlug: 'electronics',
        brand: 'Samsung',
        productName: 'Galaxy Phone',
        keyAttribute: '5G',
      });
      const value = slug.getValue();
      const electronics = value.indexOf('electronics');
      const samsung = value.indexOf('samsung');
      const galaxy = value.indexOf('galaxy');
      expect(electronics).toBeLessThan(samsung);
      expect(samsung).toBeLessThan(galaxy);
    });
  });
});
