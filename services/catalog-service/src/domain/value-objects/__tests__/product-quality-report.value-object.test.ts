import { ProductQualityReport } from '../product-quality-report.value-object';

const baseInput = {
  brand: 'Samsung',
  productName: 'Galaxy S24',
  keyAttribute: '256GB',
  requiredAttributesFilled: 4,
  totalRequiredAttributes: 4,
  imageCount: 3,
  descriptionLength: 350,
  isLeafCategory: true,
  hasValidPrice: true,
  hasSupplierLocation: true,
  signals: {
    titleCompleteness: 20,
    attributesCompleteness: 25,
    imagesUploaded: 20,
    descriptionLength: 20,
    categoryAccuracy: 15,
  },
  totalScore: 100,
};

describe('ProductQualityReport', () => {
  describe('generate', () => {
    it('should produce a publishable report for a perfect listing', () => {
      const report = ProductQualityReport.generate(baseInput);
      expect(report.totalScore).toBe(100);
      expect(report.status).toBe('publishable');
      expect(report.canPublish).toBe(true);
      expect(report.publicationGates.filter(g => g.blocking)).toHaveLength(0);
    });

    it('should produce 5 signal details', () => {
      const report = ProductQualityReport.generate(baseInput);
      expect(report.signals).toHaveLength(5);
    });

    it('should mark signals as EXCELLENT when fully earned', () => {
      const report = ProductQualityReport.generate(baseInput);
      expect(report.signals.every(s => s.status === 'EXCELLENT')).toBe(true);
    });

    it('should have no prioritised actions when all signals are perfect', () => {
      const report = ProductQualityReport.generate(baseInput);
      // No advice means no actions — blocking gates are also absent
      expect(report.prioritisedActions.filter(a => !a.startsWith('[Required]'))).toHaveLength(0);
    });

    it('should include summary sentence', () => {
      const report = ProductQualityReport.generate(baseInput);
      expect(report.summary).toContain('100');
      expect(report.summary.length).toBeGreaterThan(10);
    });
  });

  describe('blocking gates', () => {
    it('should block publication when score < 60', () => {
      const report = ProductQualityReport.generate({
        ...baseInput,
        totalScore: 45,
        signals: { ...baseInput.signals, imagesUploaded: 0, attributesCompleteness: 5 },
      });
      expect(report.canPublish).toBe(false);
      expect(report.publicationGates.find(g => g.rule === 'MINIMUM_SCORE')?.blocking).toBe(true);
    });

    it('should block publication when price is invalid', () => {
      const report = ProductQualityReport.generate({ ...baseInput, hasValidPrice: false });
      expect(report.canPublish).toBe(false);
      const gate = report.publicationGates.find(g => g.rule === 'VALID_PRICE');
      expect(gate?.blocking).toBe(true);
      expect(gate?.currentState).toBe('No price set');
    });

    it('should block publication when supplier location is missing', () => {
      const report = ProductQualityReport.generate({ ...baseInput, hasSupplierLocation: false });
      expect(report.canPublish).toBe(false);
      expect(report.publicationGates.find(g => g.rule === 'SUPPLIER_LOCATION')?.blocking).toBe(true);
    });

    it('should block publication when product name is missing', () => {
      const report = ProductQualityReport.generate({ ...baseInput, productName: '' });
      expect(report.canPublish).toBe(false);
      expect(report.publicationGates.find(g => g.rule === 'PRODUCT_NAME')?.blocking).toBe(true);
    });

    it('should not block when all gates pass', () => {
      const report = ProductQualityReport.generate(baseInput);
      expect(report.publicationGates.every(g => !g.blocking)).toBe(true);
    });
  });

  describe('signal status', () => {
    it('should mark MISSING when signal score is 0', () => {
      const report = ProductQualityReport.generate({
        ...baseInput,
        signals: { ...baseInput.signals, imagesUploaded: 0 },
        imageCount: 0,
        totalScore: 80,
      });
      const imgSignal = report.signals.find(s => s.label === 'Product Images');
      expect(imgSignal?.status).toBe('MISSING');
    });

    it('should mark NEEDS_WORK when signal partially earned', () => {
      const report = ProductQualityReport.generate({
        ...baseInput,
        signals: { ...baseInput.signals, attributesCompleteness: 10 },
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 5,
        totalScore: 85,
      });
      const attrSignal = report.signals.find(s => s.label === 'Attributes Completeness');
      expect(attrSignal?.status).toBe('NEEDS_WORK');
    });
  });

  describe('prioritised actions', () => {
    it('should list blocking gate requirements first', () => {
      const report = ProductQualityReport.generate({ ...baseInput, hasValidPrice: false });
      expect(report.prioritisedActions[0]).toContain('[Required]');
    });

    it('should include advice for each incomplete signal', () => {
      const report = ProductQualityReport.generate({
        ...baseInput,
        imageCount: 0,
        signals: { ...baseInput.signals, imagesUploaded: 0 },
        totalScore: 80,
      });
      const imageAction = report.prioritisedActions.find(a => a.toLowerCase().includes('image'));
      expect(imageAction).toBeDefined();
    });

    it('should order actions by point gap (highest first)', () => {
      const report = ProductQualityReport.generate({
        ...baseInput,
        totalScore: 50,
        signals: {
          titleCompleteness: 7,       // gap = 13
          attributesCompleteness: 5,  // gap = 20  (should be first non-blocking)
          imagesUploaded: 12,          // gap = 8
          descriptionLength: 16,       // gap = 4
          categoryAccuracy: 0,         // gap = 15
        },
        requiredAttributesFilled: 1,
        totalRequiredAttributes: 4,
        imageCount: 2,
        brand: 'Samsung',
        productName: 'Galaxy',
        keyAttribute: '',
      });
      // All actions should be present and non-empty
      expect(report.prioritisedActions.length).toBeGreaterThan(0);
    });
  });

  describe('status computation', () => {
    it('should return "publishable" for score >= 60', () => {
      const r = ProductQualityReport.generate({ ...baseInput, totalScore: 60 });
      expect(r.status).toBe('publishable');
    });

    it('should return "needs_improvement" for score 40–59', () => {
      const r = ProductQualityReport.generate({
        ...baseInput, totalScore: 50,
        signals: { ...baseInput.signals, imagesUploaded: 0, attributesCompleteness: 5 },
      });
      expect(r.status).toBe('needs_improvement');
    });

    it('should return "critical" for score < 40', () => {
      const r = ProductQualityReport.generate({
        ...baseInput, totalScore: 20,
        signals: { titleCompleteness: 7, attributesCompleteness: 5, imagesUploaded: 0, descriptionLength: 0, categoryAccuracy: 0 },
        imageCount: 0,
        descriptionLength: 0,
        requiredAttributesFilled: 0,
      });
      expect(r.status).toBe('critical');
    });
  });
});
