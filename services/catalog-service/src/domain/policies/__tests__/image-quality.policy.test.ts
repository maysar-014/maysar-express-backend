import { ImageQualityPolicy } from '../image-quality.policy';

describe('ImageQualityPolicy', () => {
  describe('evaluate', () => {
    it('should score 0 when no images provided', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: [],
        categorySlug: 'electronics',
      });
      expect(result.score).toBe(0);
      expect(result.hasPrimaryImage).toBe(false);
      expect(result.meetsMinimum).toBe(false);
    });

    it('should score 0 when mediaUrls is empty', () => {
      const result = ImageQualityPolicy.evaluate({ mediaUrls: [], categorySlug: 'general' });
      expect(result.score).toBe(0);
      expect(result.imageCount).toBe(0);
    });

    it('should return full score (20) when recommended count is met', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        categorySlug: 'general',
      });
      expect(result.score).toBe(20);
      expect(result.meetsRecommended).toBe(true);
    });

    it('should detect and count duplicate URLs', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img1.jpg', 'img2.jpg'],
        categorySlug: 'general',
      });
      expect(result.duplicatesDetected).toBe(1);
      expect(result.uniqueImageCount).toBe(2);
      expect(result.imageCount).toBe(3);
    });

    it('should report hasPrimaryImage when first URL is present', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['primary.jpg'],
        categorySlug: 'general',
      });
      expect(result.hasPrimaryImage).toBe(true);
    });

    it('should use explicit primaryImageUrl when provided', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg'],
        primaryImageUrl: 'primary.jpg',
        categorySlug: 'general',
      });
      expect(result.hasPrimaryImage).toBe(true);
    });

    it('should set meetsMinimum true when count >= minimum', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg'],
        categorySlug: 'food', // minimum = 1
      });
      expect(result.meetsMinimum).toBe(true);
    });

    it('should set meetsMinimum false when count < minimum', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: [],
        categorySlug: 'electronics', // minimum = 2
      });
      expect(result.meetsMinimum).toBe(false);
    });
  });

  describe('category-specific specs', () => {
    it('should apply electronics spec (recommended = 4)', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
        categorySlug: 'electronics',
      });
      expect(result.meetsRecommended).toBe(true);
    });

    it('should apply food/grocery spec (recommended = 3, minimum = 1)', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['front.jpg'],
        categorySlug: 'grocery',
      });
      expect(result.meetsMinimum).toBe(true);
      expect(result.meetsRecommended).toBe(false);
    });

    it('should fall back to default spec for unknown categories', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        categorySlug: 'unknown-category-xyz',
      });
      expect(result.meetsRecommended).toBe(true); // default recommended = 3
    });
  });

  describe('coverage advice', () => {
    it('should advise uploading images when none provided', () => {
      const result = ImageQualityPolicy.evaluate({ mediaUrls: [], categorySlug: 'general' });
      expect(result.coverageAdvice.some(a => a.toLowerCase().includes('image'))).toBe(true);
    });

    it('should advise replacing duplicates when detected', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img.jpg', 'img.jpg', 'img2.jpg'],
        categorySlug: 'general',
      });
      expect(result.coverageAdvice.some(a => a.toLowerCase().includes('duplicate'))).toBe(true);
    });

    it('should advise adding more images when below recommended', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg'],
        categorySlug: 'general', // recommended = 3
      });
      expect(result.coverageAdvice.some(a => a.toLowerCase().includes('more'))).toBe(true);
    });

    it('should return no coverage advice when recommended is met with no duplicates', () => {
      const result = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        categorySlug: 'general',
      });
      expect(result.coverageAdvice).toHaveLength(0);
    });
  });

  describe('score scaling', () => {
    it('should give partial score for partial coverage', () => {
      const oneImage = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg'],
        categorySlug: 'general', // recommended = 3
      });
      const twoImages = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img2.jpg'],
        categorySlug: 'general',
      });
      const threeImages = ImageQualityPolicy.evaluate({
        mediaUrls: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        categorySlug: 'general',
      });
      expect(oneImage.score).toBeLessThan(twoImages.score);
      expect(twoImages.score).toBeLessThan(threeImages.score);
      expect(threeImages.score).toBe(20);
    });
  });
});
