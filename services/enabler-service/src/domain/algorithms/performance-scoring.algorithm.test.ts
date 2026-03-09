import { PerformanceScoringAlgorithm } from './performance-scoring.algorithm';

describe('PerformanceScoringAlgorithm', () => {
  it('calculates weighted score on 0-100 scale', () => {
    const score = PerformanceScoringAlgorithm.calculateScore({
      salesVolume: 0.8,
      completionRate: 0.9,
      rating: 4
    });

    expect(score).toBeCloseTo((0.8 * 0.4 + 0.9 * 0.3 + (4 / 5) * 0.3) * 100, 6);
  });

  it('clamps score to valid bounds', () => {
    const lower = PerformanceScoringAlgorithm.calculateScore({
      salesVolume: -10,
      completionRate: -5,
      rating: -5
    });
    const upper = PerformanceScoringAlgorithm.calculateScore({
      salesVolume: 10,
      completionRate: 10,
      rating: 50
    });

    expect(lower).toBe(0);
    expect(upper).toBe(100);
  });
});

