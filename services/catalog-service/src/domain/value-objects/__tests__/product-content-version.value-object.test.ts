import { ProductContentVersion, ContentInputSnapshot } from '../product-content-version.value-object';

describe('ProductContentVersion', () => {
  const snapshot: ContentInputSnapshot = {
    brand: 'Samsung',
    productName: 'Galaxy S24',
    categorySlug: 'smartphones',
    attributes: { storage: '256GB', ram: '8GB' },
    schemaVersion: 'schema-2',
  };

  describe('createInitial', () => {
    it('should create version 1 with UNVERIFIED status', () => {
      const v = ProductContentVersion.createInitial(snapshot);

      expect(v.getVersion()).toBe(1);
      expect(v.getVerificationStatus()).toBe('UNVERIFIED');
      expect(v.getSource()).toBe('DETERMINISTIC');
    });

    it('should store the input snapshot', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      const stored = v.getInputSnapshot();

      expect(stored.brand).toBe('Samsung');
      expect(stored.productName).toBe('Galaxy S24');
      expect(stored.attributes.storage).toBe('256GB');
    });

    it('should record generation timestamp', () => {
      const before = new Date();
      const v = ProductContentVersion.createInitial(snapshot);
      const after = new Date();

      expect(v.getGeneratedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(v.getGeneratedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept AI_ASSISTED source', () => {
      const v = ProductContentVersion.createInitial(snapshot, 'AI_ASSISTED');
      expect(v.getSource()).toBe('AI_ASSISTED');
    });
  });

  describe('bump', () => {
    it('should increment the version number', () => {
      const v1 = ProductContentVersion.createInitial(snapshot);
      const newSnapshot: ContentInputSnapshot = { ...snapshot, attributes: { storage: '512GB' } };
      const v2 = v1.bump(newSnapshot);

      expect(v2.getVersion()).toBe(2);
    });

    it('should use the new snapshot', () => {
      const v1 = ProductContentVersion.createInitial(snapshot);
      const newSnapshot: ContentInputSnapshot = { ...snapshot, brand: 'Apple' };
      const v2 = v1.bump(newSnapshot);

      expect(v2.getInputSnapshot().brand).toBe('Apple');
    });

    it('should reset verification status to UNVERIFIED', () => {
      const v1 = ProductContentVersion.createInitial(snapshot)
        .withVerificationStatus('EVIDENCE_VERIFIED');
      const v2 = v1.bump(snapshot);

      expect(v2.getVerificationStatus()).toBe('UNVERIFIED');
    });

    it('should preserve the generation source', () => {
      const v1 = ProductContentVersion.createInitial(snapshot, 'AI_ASSISTED');
      const v2 = v1.bump(snapshot);

      expect(v2.getSource()).toBe('AI_ASSISTED');
    });
  });

  describe('isStaleFor', () => {
    it('should return false when brand, name, and attributes are unchanged', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      expect(v.isStaleFor(snapshot.attributes, snapshot.brand, snapshot.productName)).toBe(false);
    });

    it('should return true when brand changes', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      expect(v.isStaleFor(snapshot.attributes, 'Apple', snapshot.productName)).toBe(true);
    });

    it('should return true when product name changes', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      expect(v.isStaleFor(snapshot.attributes, snapshot.brand, 'Galaxy S25')).toBe(true);
    });

    it('should return true when an attribute value changes', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      expect(v.isStaleFor({ ...snapshot.attributes, storage: '512GB' }, snapshot.brand, snapshot.productName)).toBe(true);
    });

    it('should return true when a new attribute key is added', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      const newAttrs = { ...snapshot.attributes, battery: '5000mAh' };
      expect(v.isStaleFor(newAttrs, snapshot.brand, snapshot.productName)).toBe(true);
    });

    it('should return true when an attribute key is removed', () => {
      const v = ProductContentVersion.createInitial(snapshot);
      const { ram: _removed, ...remaining } = snapshot.attributes;
      expect(v.isStaleFor(remaining, snapshot.brand, snapshot.productName)).toBe(true);
    });
  });

  describe('withVerificationStatus', () => {
    it('should return a new instance with updated status', () => {
      const v1 = ProductContentVersion.createInitial(snapshot);
      const v2 = v1.withVerificationStatus('EVIDENCE_VERIFIED');

      expect(v2.getVerificationStatus()).toBe('EVIDENCE_VERIFIED');
      // Original is unchanged
      expect(v1.getVerificationStatus()).toBe('UNVERIFIED');
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should round-trip through JSON serialisation', () => {
      const v1 = ProductContentVersion.createInitial(snapshot);
      const json = v1.toJSON();
      const v2 = ProductContentVersion.fromJSON(json);

      expect(v2.getVersion()).toBe(v1.getVersion());
      expect(v2.getSource()).toBe(v1.getSource());
      expect(v2.getVerificationStatus()).toBe(v1.getVerificationStatus());
      expect(v2.getInputSnapshot()).toEqual(v1.getInputSnapshot());
    });
  });
});
