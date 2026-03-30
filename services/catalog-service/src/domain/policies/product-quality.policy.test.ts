import { ProductQualityPolicy } from './product-quality.policy';
import { QualityScore } from '../value-objects/product-quality-score.value-object';

describe('ProductQualityPolicy', () => {
  describe('computeScore', () => {
    it('should compute perfect score', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBe(100);
      expect(score.isPublishable()).toBe(true);
    });

    it('should compute score with missing brand', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: '',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with missing product name', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: '',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with missing key attribute', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with partial attributes', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 1,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with no images', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 0,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with one image', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 1,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeGreaterThan(80);
    });

    it('should compute score with short description', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 50,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeLessThan(100);
    });

    it('should compute score with non-leaf category', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Cooking Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: false,
      });
      expect(score.getValue()).toBeLessThan(100);
    });
  });

  describe('canPublish', () => {
    it('should allow publish for score >= 60', () => {
      const score = QualityScore.fromScore(60);
      expect(ProductQualityPolicy.canPublish(score)).toBe(true);
    });

    it('should allow publish for score > 60', () => {
      const score = QualityScore.fromScore(95);
      expect(ProductQualityPolicy.canPublish(score)).toBe(true);
    });

    it('should reject publish for score < 60', () => {
      const score = QualityScore.fromScore(59);
      expect(ProductQualityPolicy.canPublish(score)).toBe(false);
    });

    it('should reject publish for score 0', () => {
      const score = QualityScore.fromScore(0);
      expect(ProductQualityPolicy.canPublish(score)).toBe(false);
    });
  });

  describe('getPublishThreshold', () => {
    it('should return 60', () => {
      expect(ProductQualityPolicy.getPublishThreshold()).toBe(60);
    });
  });

  describe('getSignalWeights', () => {
    it('should return all signal weights', () => {
      const weights = ProductQualityPolicy.getSignalWeights();
      expect(weights.titleCompleteness).toBe(20);
      expect(weights.attributesCompleteness).toBe(25);
      expect(weights.imagesUploaded).toBe(20);
      expect(weights.descriptionLength).toBe(20);
      expect(weights.categoryAccuracy).toBe(15);
    });

    it('should sum to 100', () => {
      const weights = ProductQualityPolicy.getSignalWeights();
      const total = Object.values(weights).reduce((sum: number, w: number) => sum + w, 0);
      expect(total).toBe(100);
    });
  });

  describe('getTotalPossibleScore', () => {
    it('should return 100', () => {
      expect(ProductQualityPolicy.getTotalPossibleScore()).toBe(100);
    });
  });

  describe('scoring signals', () => {
    it('should score title completeness correctly', () => {
      const withBrand = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      const withoutBrand = ProductQualityPolicy.computeScore({
        brand: '',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      expect(withBrand.getValue()).toBeGreaterThan(withoutBrand.getValue());
    });

    it('should score attributes completeness correctly', () => {
      const complete = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      const partial = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 1,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      expect(complete.getValue()).toBeGreaterThan(partial.getValue());
    });

    it('should score images correctly', () => {
      const withImages = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      const noImages = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 0,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      expect(withImages.getValue()).toBeGreaterThan(noImages.getValue());
    });

    it('should score description length correctly', () => {
      const longDesc = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      const shortDesc = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 50,
        isLeafCategory: true,
      });

      expect(longDesc.getValue()).toBeGreaterThan(shortDesc.getValue());
    });

    it('should score category accuracy correctly', () => {
      const leafCategory = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });

      const parentCategory = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: false,
      });

      expect(leafCategory.getValue()).toBeGreaterThan(parentCategory.getValue());
    });
  });

  describe('edge cases', () => {
    it('should handle zero required attributes', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 0,
        totalRequiredAttributes: 0,
        imageCount: 3,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBeGreaterThan(0);
    });

    it('should handle very long description', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 3,
        descriptionLength: 5000,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBe(100);
    });

    it('should handle many images', () => {
      const score = ProductQualityPolicy.computeScore({
        brand: 'Azam',
        productName: 'Oil',
        keyAttribute: '5L',
        requiredAttributesFilled: 2,
        totalRequiredAttributes: 2,
        imageCount: 10,
        descriptionLength: 300,
        isLeafCategory: true,
      });
      expect(score.getValue()).toBe(100);
    });
  });
});
