import { QualityScore, QualityScoreSignals } from '../product-quality-score.value-object';

describe('QualityScore', () => {
  const validSignals: QualityScoreSignals = {
    titleCompleteness: 20,
    attributesCompleteness: 25,
    imagesUploaded: 20,
    descriptionLength: 20,
    categoryAccuracy: 15,
  };

  describe('create', () => {
    it('should create with valid signals', () => {
      const score = QualityScore.create(validSignals);
      expect(score.getValue()).toBe(100);
    });

    it('should sum signals correctly', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 10,
        attributesCompleteness: 15,
        imagesUploaded: 10,
        descriptionLength: 10,
        categoryAccuracy: 10,
      };
      const score = QualityScore.create(signals);
      expect(score.getValue()).toBe(55);
    });

    it('should throw on score > 100', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 30,
        attributesCompleteness: 30,
        imagesUploaded: 30,
        descriptionLength: 30,
        categoryAccuracy: 30,
      };
      expect(() => QualityScore.create(signals)).toThrow();
    });

    it('should throw on negative score', () => {
      expect(() => QualityScore.fromScore(-1)).toThrow();
    });
  });

  describe('isPublishable', () => {
    it('should return true for score >= 60', () => {
      const score = QualityScore.fromScore(60);
      expect(score.isPublishable()).toBe(true);
    });

    it('should return true for score > 60', () => {
      const score = QualityScore.fromScore(95);
      expect(score.isPublishable()).toBe(true);
    });

    it('should return false for score < 60', () => {
      const score = QualityScore.fromScore(59);
      expect(score.isPublishable()).toBe(false);
    });

    it('should return false for score 0', () => {
      const score = QualityScore.fromScore(0);
      expect(score.isPublishable()).toBe(false);
    });
  });

  describe('getPublishThreshold', () => {
    it('should return 60', () => {
      const score = QualityScore.fromScore(50);
      expect(score.getPublishThreshold()).toBe(60);
    });
  });

  describe('getScoreBreakdown', () => {
    it('should return signals', () => {
      const score = QualityScore.create(validSignals);
      const breakdown = score.getScoreBreakdown();
      expect(breakdown).toEqual(validSignals);
    });

    it('should return copy not reference', () => {
      const score = QualityScore.create(validSignals);
      const breakdown = score.getScoreBreakdown();
      breakdown.titleCompleteness = 0;
      expect(score.getScoreBreakdown().titleCompleteness).toBe(20);
    });
  });

  describe('getScorePercentage', () => {
    it('should return 100 for score 100', () => {
      const score = QualityScore.fromScore(100);
      expect(score.getScorePercentage()).toBe(100);
    });

    it('should return 50 for score 50', () => {
      const score = QualityScore.fromScore(50);
      expect(score.getScorePercentage()).toBe(50);
    });

    it('should return 0 for score 0', () => {
      const score = QualityScore.fromScore(0);
      expect(score.getScorePercentage()).toBe(0);
    });
  });

  describe('getPublishabilityStatus', () => {
    it('should return publishable for score >= 60', () => {
      const score = QualityScore.fromScore(60);
      expect(score.getPublishabilityStatus()).toBe('publishable');
    });

    it('should return needs_improvement for score 40-59', () => {
      const score = QualityScore.fromScore(50);
      expect(score.getPublishabilityStatus()).toBe('needs_improvement');
    });

    it('should return critical for score < 40', () => {
      const score = QualityScore.fromScore(30);
      expect(score.getPublishabilityStatus()).toBe('critical');
    });
  });

  describe('getSuggestionsForImprovement', () => {
    it('should suggest title improvement', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 0,
        attributesCompleteness: 25,
        imagesUploaded: 20,
        descriptionLength: 20,
        categoryAccuracy: 15,
      };
      const score = QualityScore.create(signals);
      const suggestions = score.getSuggestionsForImprovement();
      expect(suggestions.some((suggestion) => suggestion.includes('title'))).toBe(true);
    });

    it('should suggest attributes improvement', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 20,
        attributesCompleteness: 0,
        imagesUploaded: 20,
        descriptionLength: 20,
        categoryAccuracy: 15,
      };
      const score = QualityScore.create(signals);
      const suggestions = score.getSuggestionsForImprovement();
      expect(suggestions.some((suggestion) => suggestion.includes('attribute'))).toBe(true);
    });

    it('should suggest images improvement', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 20,
        attributesCompleteness: 25,
        imagesUploaded: 0,
        descriptionLength: 20,
        categoryAccuracy: 15,
      };
      const score = QualityScore.create(signals);
      const suggestions = score.getSuggestionsForImprovement();
      expect(suggestions.some((suggestion) => suggestion.includes('image'))).toBe(true);
    });

    it('should suggest description improvement', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 20,
        attributesCompleteness: 25,
        imagesUploaded: 20,
        descriptionLength: 0,
        categoryAccuracy: 15,
      };
      const score = QualityScore.create(signals);
      const suggestions = score.getSuggestionsForImprovement();
      expect(suggestions.some((suggestion) => suggestion.includes('description'))).toBe(true);
    });

    it('should suggest category improvement', () => {
      const signals: QualityScoreSignals = {
        titleCompleteness: 20,
        attributesCompleteness: 25,
        imagesUploaded: 20,
        descriptionLength: 20,
        categoryAccuracy: 0,
      };
      const score = QualityScore.create(signals);
      const suggestions = score.getSuggestionsForImprovement();
      expect(suggestions.some((suggestion) => suggestion.includes('category'))).toBe(true);
    });

    it('should return empty array for perfect score', () => {
      const score = QualityScore.create(validSignals);
      expect(score.getSuggestionsForImprovement()).toHaveLength(0);
    });
  });

  describe('compare', () => {
    it('should return positive when this > other', () => {
      const score1 = QualityScore.fromScore(80);
      const score2 = QualityScore.fromScore(60);
      expect(score1.compare(score2)).toBeGreaterThan(0);
    });

    it('should return negative when this < other', () => {
      const score1 = QualityScore.fromScore(60);
      const score2 = QualityScore.fromScore(80);
      expect(score1.compare(score2)).toBeLessThan(0);
    });

    it('should return 0 when equal', () => {
      const score1 = QualityScore.fromScore(70);
      const score2 = QualityScore.fromScore(70);
      expect(score1.compare(score2)).toBe(0);
    });
  });

  describe('equals', () => {
    it('should return true for equal scores', () => {
      const score1 = QualityScore.fromScore(75);
      const score2 = QualityScore.fromScore(75);
      expect(score1.equals(score2)).toBe(true);
    });

    it('should return false for different scores', () => {
      const score1 = QualityScore.fromScore(75);
      const score2 = QualityScore.fromScore(70);
      expect(score1.equals(score2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format score correctly', () => {
      const score = QualityScore.fromScore(95);
      expect(score.toString()).toContain('95');
      expect(score.toString()).toContain('publishable');
    });
  });

  describe('boundary conditions', () => {
    it('should handle score exactly at threshold', () => {
      const score = QualityScore.fromScore(60);
      expect(score.isPublishable()).toBe(true);
      expect(score.getPublishabilityStatus()).toBe('publishable');
    });

    it('should handle score just below threshold', () => {
      const score = QualityScore.fromScore(59);
      expect(score.isPublishable()).toBe(false);
      expect(score.getPublishabilityStatus()).toBe('needs_improvement');
    });

    it('should handle score at critical boundary', () => {
      const score = QualityScore.fromScore(40);
      expect(score.getPublishabilityStatus()).toBe('needs_improvement');
    });

    it('should handle score just below critical', () => {
      const score = QualityScore.fromScore(39);
      expect(score.getPublishabilityStatus()).toBe('critical');
    });
  });
});
