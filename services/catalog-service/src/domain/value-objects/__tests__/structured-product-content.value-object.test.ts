import { StructuredProductContent } from '../structured-product-content.value-object';

const generatedDesc = {
  overview: 'Samsung Galaxy S24 is listed in Smartphones.',
  keyFeatures: ['Storage: 256GB', 'RAM: 8GB', 'Display: 6.2 inch'],
  specifications: { Weight: '167g', Warranty: '2 years' },
  usage: 'Use: Professional & Gaming.',
  sellerOffer: {
    delivery: 'Delivery: Free delivery in 3 days.',
    supplierInfo: 'Supplier location: Kariakoo, Dar es Salaam.',
  },
  schemaVersion: 'schema-5',
};

describe('StructuredProductContent', () => {
  describe('fromGeneratedDescription', () => {
    it('should create sections from a generated description', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const sections = content.getAllSections();
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should include an OVERVIEW section', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const overview = content.getSection('OVERVIEW');
      expect(overview).toBeDefined();
      expect(overview?.content).toContain('Samsung Galaxy S24');
    });

    it('should include a KEY_FEATURES section', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const features = content.getSection('KEY_FEATURES');
      expect(features).toBeDefined();
      expect(features?.content).toContain('256GB');
    });

    it('should include a SPECIFICATIONS section', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const specs = content.getSection('SPECIFICATIONS');
      expect(specs).toBeDefined();
      expect(specs?.content).toContain('167g');
    });

    it('should mark seller-offer sections as isSellerOffer=true', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const delivery = content.getSection('SELLER_OFFER_DELIVERY');
      const location = content.getSection('SELLER_OFFER_LOCATION');
      expect(delivery?.isSellerOffer).toBe(true);
      expect(location?.isSellerOffer).toBe(true);
    });

    it('should mark canonical sections as isSellerOffer=false', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const overview = content.getSection('OVERVIEW');
      const features = content.getSection('KEY_FEATURES');
      expect(overview?.isSellerOffer).toBe(false);
      expect(features?.isSellerOffer).toBe(false);
    });

    it('should NOT create seller-offer sections when empty', () => {
      const noOffer = StructuredProductContent.fromGeneratedDescription({
        ...generatedDesc,
        sellerOffer: { delivery: '', supplierInfo: '' },
      });
      expect(noOffer.getSection('SELLER_OFFER_DELIVERY')).toBeUndefined();
      expect(noOffer.getSection('SELLER_OFFER_LOCATION')).toBeUndefined();
    });
  });

  describe('getCanonicalSections', () => {
    it('should return only non-seller-offer sections', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const canonical = content.getCanonicalSections();
      expect(canonical.every(s => !s.isSellerOffer)).toBe(true);
    });

    it('should include OVERVIEW, KEY_FEATURES, SPECIFICATIONS, USAGE', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const types = content.getCanonicalSections().map(s => s.type);
      expect(types).toContain('OVERVIEW');
      expect(types).toContain('KEY_FEATURES');
      expect(types).toContain('SPECIFICATIONS');
      expect(types).toContain('USAGE');
    });
  });

  describe('getSellerOfferSections', () => {
    it('should return only seller-offer sections', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const offer = content.getSellerOfferSections();
      expect(offer.every(s => s.isSellerOffer)).toBe(true);
      expect(offer.length).toBe(2);
    });
  });

  describe('composeCanonicalDescription', () => {
    it('should compose a non-empty canonical description', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const desc = content.composeCanonicalDescription();
      expect(desc.length).toBeGreaterThan(0);
    });

    it('should include overview text', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      expect(content.composeCanonicalDescription()).toContain('Samsung Galaxy S24');
    });

    it('should NOT include seller-offer data in canonical description', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const desc = content.composeCanonicalDescription();
      expect(desc).not.toContain('Kariakoo');
      expect(desc).not.toContain('Free delivery');
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should round-trip through JSON serialisation', () => {
      const content = StructuredProductContent.fromGeneratedDescription(generatedDesc);
      const json = content.toJSON();
      const restored = StructuredProductContent.fromJSON(json);
      expect(restored.getAllSections().length).toBe(content.getAllSections().length);
      expect(restored.getSchemaVersion()).toBe('schema-5');
      expect(restored.getVersion()).toBe(1);
    });
  });
});
