import { QualityScore } from './quality-score.value-object';

describe('QualityScore', () => {
  it('computes defect rate and threshold acceptance', () => {
    const score = new QualityScore({
      score: 92,
      totalInspections: 50,
      passedInspections: 45
    });

    expect(score.defectRate).toBe(10);
    expect(score.isAcceptable(90)).toBe(true);
    expect(score.isAcceptable(95)).toBe(false);
  });

  it('creates from inspection counts and handles zero inspections', () => {
    const fromData = QualityScore.fromInspections(10, 9);
    const zero = QualityScore.fromInspections(0, 0);

    expect(fromData.score).toBe(90);
    expect(fromData.totalInspections).toBe(10);
    expect(zero.score).toBe(100);
    expect(zero.defectRate).toBe(0);
  });

  it('validates score and inspection bounds', () => {
    expect(() => new QualityScore({ score: -1, totalInspections: 1, passedInspections: 1 })).toThrow(
      'Score must be between 0 and 100'
    );
    expect(() => new QualityScore({ score: 50, totalInspections: 1, passedInspections: 2 })).toThrow(
      'Passed inspections cannot exceed total inspections'
    );
  });
});
