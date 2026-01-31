import { BusinessId } from '../business-id.value-object';

describe('BusinessId Value Object', () => {
  describe('create', () => {
    it('should create BusinessId with provided value', () => {
      const id = BusinessId.create('BIZ-123-ABC');
      expect(id.getValue()).toBe('BIZ-123-ABC');
    });

    it('should generate new ID when no value provided', () => {
      const id = BusinessId.create();
      expect(id.getValue()).toMatch(/^BIZ-/);
    });

    it('should throw for invalid format', () => {
      expect(() => BusinessId.create('invalid')).toThrow();
    });
  });

  describe('generate', () => {
    it('should generate unique IDs', () => {
      const id1 = BusinessId.generate();
      const id2 = BusinessId.generate();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^BIZ-/);
    });
  });

  describe('isValid', () => {
    it('should validate correct format', () => {
      expect(BusinessId.isValid('BIZ-123-ABC')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(BusinessId.isValid('')).toBe(false);
      expect(BusinessId.isValid('invalid')).toBe(false);
    });
  });
});
