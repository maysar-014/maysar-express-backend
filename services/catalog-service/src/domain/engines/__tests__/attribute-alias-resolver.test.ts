import { AttributeAliasResolver } from '../attribute-alias-resolver';

describe('AttributeAliasResolver', () => {
  describe('resolve', () => {
    it('should resolve storage aliases to canonical key', () => {
      expect(AttributeAliasResolver.resolve('Internal Memory')).toBe('storage');
      expect(AttributeAliasResolver.resolve('ROM')).toBe('storage');
      expect(AttributeAliasResolver.resolve('built-in storage')).toBe('storage');
      expect(AttributeAliasResolver.resolve('storage capacity')).toBe('storage');
    });

    it('should resolve RAM aliases', () => {
      expect(AttributeAliasResolver.resolve('memory')).toBe('ram');
      expect(AttributeAliasResolver.resolve('System Memory')).toBe('ram');
    });

    it('should resolve display aliases', () => {
      expect(AttributeAliasResolver.resolve('screen')).toBe('display');
      expect(AttributeAliasResolver.resolve('Screen Size')).toBe('display');
    });

    it('should resolve processor aliases', () => {
      expect(AttributeAliasResolver.resolve('CPU')).toBe('processor');
      expect(AttributeAliasResolver.resolve('chipset')).toBe('processor');
    });

    it('should resolve warranty aliases', () => {
      expect(AttributeAliasResolver.resolve('guarantee')).toBe('warranty');
      expect(AttributeAliasResolver.resolve('warranty period')).toBe('warranty');
    });

    it('should resolve color aliases', () => {
      expect(AttributeAliasResolver.resolve('colour')).toBe('color');
      expect(AttributeAliasResolver.resolve('Finish')).toBe('color');
    });

    it('should resolve canonical keys to themselves', () => {
      expect(AttributeAliasResolver.resolve('storage')).toBe('storage');
      expect(AttributeAliasResolver.resolve('ram')).toBe('ram');
      expect(AttributeAliasResolver.resolve('weight')).toBe('weight');
    });

    it('should return normalised unknown keys as-is', () => {
      expect(AttributeAliasResolver.resolve('custom_field')).toBe('custom_field');
      expect(AttributeAliasResolver.resolve('Unknown Attribute')).toBe('unknown_attribute');
    });

    it('should be case-insensitive', () => {
      expect(AttributeAliasResolver.resolve('INTERNAL MEMORY')).toBe('storage');
      expect(AttributeAliasResolver.resolve('internal memory')).toBe('storage');
      expect(AttributeAliasResolver.resolve('Internal Memory')).toBe('storage');
    });

    it('should handle empty string', () => {
      expect(AttributeAliasResolver.resolve('')).toBe('');
    });
  });

  describe('resolveAll', () => {
    it('should resolve all keys in a map to canonical equivalents', () => {
      const input = { 'Internal Memory': '256GB', 'RAM': '8GB', 'Color': 'Black' };
      const result = AttributeAliasResolver.resolveAll(input);

      expect(result['storage']).toBe('256GB');
      expect(result['ram']).toBe('8GB');
      expect(result['color']).toBe('Black');
    });

    it('should take first non-empty value when multiple keys resolve to same canonical', () => {
      const input = { 'Internal Memory': '256GB', 'ROM': '512GB' };
      const result = AttributeAliasResolver.resolveAll(input);

      // Both resolve to 'storage' — first non-empty wins
      expect(result['storage']).toBe('256GB');
      expect(Object.keys(result).filter(k => k === 'storage').length).toBe(1);
    });

    it('should skip empty values', () => {
      const input = { 'Internal Memory': '', 'RAM': '8GB' };
      const result = AttributeAliasResolver.resolveAll(input);

      expect(result['storage']).toBeUndefined();
      expect(result['ram']).toBe('8GB');
    });

    it('should preserve unknown keys after normalisation', () => {
      const input = { 'custom_field': 'value1', 'Another Field': 'value2' };
      const result = AttributeAliasResolver.resolveAll(input);

      expect(result['custom_field']).toBe('value1');
      expect(result['another_field']).toBe('value2');
    });
  });

  describe('areSynonyms', () => {
    it('should return true for synonym pairs', () => {
      expect(AttributeAliasResolver.areSynonyms('Internal Memory', 'ROM')).toBe(true);
      expect(AttributeAliasResolver.areSynonyms('memory', 'System Memory')).toBe(true);
      expect(AttributeAliasResolver.areSynonyms('colour', 'color')).toBe(true);
    });

    it('should return false for non-synonym pairs', () => {
      expect(AttributeAliasResolver.areSynonyms('storage', 'ram')).toBe(false);
      expect(AttributeAliasResolver.areSynonyms('processor', 'battery')).toBe(false);
    });

    it('should return true for a key matched against itself', () => {
      expect(AttributeAliasResolver.areSynonyms('storage', 'storage')).toBe(true);
    });
  });

  describe('getAliases', () => {
    it('should return aliases for known canonical keys', () => {
      const aliases = AttributeAliasResolver.getAliases('storage');
      expect(aliases).toContain('internal memory');
      expect(aliases).toContain('rom');
    });

    it('should return empty array for unknown key', () => {
      expect(AttributeAliasResolver.getAliases('nonexistent_key')).toEqual([]);
    });
  });
});
