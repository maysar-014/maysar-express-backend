import { ConsistencyValidationPolicy } from '../consistency-validation.policy';

describe('ConsistencyValidationPolicy', () => {
  describe('validate', () => {
    it('should return consistent when no conflicts exist', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Samsung Galaxy S24 256GB',
        { storage: '256GB', ram: '8GB', battery: '5000mAh' },
        'Smartphones',
      );

      expect(result.isConsistent).toBe(true);
      expect(result.hasBlockingConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect CRITICAL conflict when title GB value differs from storage attribute', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Samsung Galaxy S24 128GB',
        { storage: '256GB' },
        'Smartphones',
      );

      expect(result.isConsistent).toBe(false);
      expect(result.hasBlockingConflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].severity).toBe('CRITICAL');
      expect(result.conflicts[0].code).toBe('DATA_CONFLICT');
    });

    it('should detect CRITICAL conflict when title mAh differs from battery attribute', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Device 5000mAh battery',
        { battery: '4000mAh' },
        'Electronics',
      );

      expect(result.hasBlockingConflicts).toBe(true);
      const batteryConflict = result.conflicts.find(c => c.field === 'battery');
      expect(batteryConflict).toBeDefined();
    });

    it('should NOT flag conflict when title and attribute values match', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Laptop 8GB RAM 512GB SSD',
        { ram: '8GB', storage: '512GB' },
        'Laptops',
      );

      // No numeric conflicts when they match
      expect(result.hasBlockingConflicts).toBe(false);
    });

    it('should detect CRITICAL conflict when engine_type is present in electronics category', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Samsung Galaxy Phone',
        { engine_type: 'Petrol', storage: '128GB' },
        'Phone',
      );

      expect(result.hasBlockingConflicts).toBe(true);
      const engineConflict = result.conflicts.find(c => c.field === 'engine_type');
      expect(engineConflict).toBeDefined();
      expect(engineConflict?.severity).toBe('CRITICAL');
    });

    it('should detect WARNING for electrical attributes in food category', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Maize Flour 5kg',
        { voltage: '220V' },
        'Food Grocery',
      );

      const electricConflict = result.conflicts.find(c => c.field === 'voltage');
      expect(electricConflict).toBeDefined();
      expect(electricConflict?.severity).toBe('WARNING');
      // Warnings alone do not block publication
      expect(result.hasBlockingConflicts).toBe(false);
    });

    it('should return only warnings for non-blocking conflicts', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Rice 5kg',
        { voltage: '220V', wattage: '50W' },
        'Grocery',
      );

      expect(result.isConsistent).toBe(false);
      expect(result.hasBlockingConflicts).toBe(false);
      expect(result.conflicts.every(c => c.severity === 'WARNING')).toBe(true);
    });

    it('should handle empty attributes without throwing', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Simple Product',
        {},
        'General',
      );

      expect(result.isConsistent).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should include conflict source and message in the result', () => {
      const result = ConsistencyValidationPolicy.validate(
        'Phone 64GB',
        { storage: '128GB' },
        'Electronics',
      );

      const conflict = result.conflicts.find(c => c.field === 'storage');
      expect(conflict?.sourceA).toBe('title');
      expect(conflict?.sourceB).toContain('attribute');
      expect(conflict?.message).toBeDefined();
      expect(conflict?.message.length).toBeGreaterThan(0);
    });
  });
});
