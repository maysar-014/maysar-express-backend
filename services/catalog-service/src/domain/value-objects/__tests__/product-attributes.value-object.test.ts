import { StructuredProductAttributes, CategoryAttributeSchema } from '../product-attributes.value-object';
import { DomainError } from '../../errors/domain.error';

describe('StructuredProductAttributes', () => {
  const schema: CategoryAttributeSchema[] = [
    {
      id: 'attr-1',
      name: 'volume',
      displayLabel: 'Volume',
      type: 'SELECT',
      options: ['1L', '5L', '10L'],
      isRequired: true,
      placeholder: 'Select volume',
    },
    {
      id: 'attr-2',
      name: 'oil_type',
      displayLabel: 'Oil Type',
      type: 'SELECT',
      options: ['Vegetable', 'Sunflower'],
      isRequired: true,
      placeholder: 'Select type',
    },
    {
      id: 'attr-3',
      name: 'color',
      displayLabel: 'Color',
      type: 'TEXT',
      isRequired: false,
    },
  ];

  describe('create', () => {
    it('should create with valid attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Golden' },
        schema
      );
      expect(attrs).toBeDefined();
    });

    it('should throw on missing required attribute', () => {
      expect(() => {
        StructuredProductAttributes.create({ volume: '5L' }, schema);
      }).toThrow('Missing required attributes');
    });

    it('should throw on invalid SELECT value', () => {
      expect(() => {
        StructuredProductAttributes.create(
          { volume: 'invalid', oil_type: 'Vegetable' },
          schema
        );
      }).toThrow('must be one of');
    });

    it('should throw on invalid NUMBER type', () => {
      const numSchema: CategoryAttributeSchema[] = [
        { id: '1', name: 'qty', displayLabel: 'Quantity', type: 'NUMBER', isRequired: true },
      ];
      expect(() => {
        StructuredProductAttributes.create({ qty: 'not-a-number' }, numSchema);
      }).toThrow('must be a number');
    });

    it('should throw on invalid BOOLEAN type', () => {
      const boolSchema: CategoryAttributeSchema[] = [
        { id: '1', name: 'organic', displayLabel: 'Organic', type: 'BOOLEAN', isRequired: true },
      ];
      expect(() => {
        StructuredProductAttributes.create({ organic: 'maybe' }, boolSchema);
      }).toThrow('must be a boolean');
    });

    it('should throw on TEXT exceeding 500 chars', () => {
      const longText = 'a'.repeat(501);
      expect(() => {
        StructuredProductAttributes.create({ volume: '5L', oil_type: 'Vegetable', color: longText }, schema);
      }).toThrow('must be 500 characters or less');
    });

    it('should accept empty string for optional attributes', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: '' },
        schema
      );
      expect(attrs.get('color')).toBe('');
    });
  });

  describe('get', () => {
    it('should return attribute value', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      expect(attrs.get('volume')).toBe('5L');
    });

    it('should return undefined for non-existent attribute', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      expect(attrs.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all attributes', () => {
      const input = { volume: '5L', oil_type: 'Vegetable', color: 'Golden' };
      const attrs = StructuredProductAttributes.create(input, schema);
      expect(attrs.getAll()).toEqual(input);
    });
  });

  describe('getKeyAttribute', () => {
    it('should return SELECT type attribute as key', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable' },
        schema
      );
      expect(attrs.getKeyAttribute()).toBe('5L');
    });

    it('should return first required attribute if no SELECT', () => {
      const simpleSchema: CategoryAttributeSchema[] = [
        { id: '1', name: 'name', displayLabel: 'Name', type: 'TEXT', isRequired: true },
      ];
      const attrs = StructuredProductAttributes.create({ name: 'Product' }, simpleSchema);
      expect(attrs.getKeyAttribute()).toBe('Product');
    });

    it('should return empty string if no attributes', () => {
      const emptySchema: CategoryAttributeSchema[] = [];
      const attrs = StructuredProductAttributes.create({}, emptySchema);
      expect(attrs.getKeyAttribute()).toBe('');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const input = { volume: '5L', oil_type: 'Vegetable' };
      const attrs = StructuredProductAttributes.create(input, schema);
      expect(JSON.stringify(attrs.toJSON())).toBe(JSON.stringify(input));
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in TEXT', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: 'Red-Gold@#$' },
        schema
      );
      expect(attrs.get('color')).toBe('Red-Gold@#$');
    });

    it('should handle whitespace in values', () => {
      const attrs = StructuredProductAttributes.create(
        { volume: '5L', oil_type: 'Vegetable', color: '  Golden  ' },
        schema
      );
      expect(attrs.get('color')).toBe('  Golden  ');
    });

    it('should handle BOOLEAN variations', () => {
      const boolSchema: CategoryAttributeSchema[] = [
        { id: '1', name: 'organic', displayLabel: 'Organic', type: 'BOOLEAN', isRequired: true },
      ];
      const validValues = ['true', 'false', '1', '0', 'yes', 'no'];
      validValues.forEach(val => {
        const attrs = StructuredProductAttributes.create({ organic: val }, boolSchema);
        expect(attrs.get('organic')).toBe(val);
      });
    });

    it('should handle NUMBER edge cases', () => {
      const numSchema: CategoryAttributeSchema[] = [
        { id: '1', name: 'qty', displayLabel: 'Quantity', type: 'NUMBER', isRequired: true },
      ];
      const validNumbers = ['0', '1', '999999', '-5', '3.14'];
      validNumbers.forEach(num => {
        const attrs = StructuredProductAttributes.create({ qty: num }, numSchema);
        expect(attrs.get('qty')).toBe(num);
      });
    });
  });
});
