import { TrainingScore } from './training-score.value-object';

describe('TrainingScore', () => {
  it('validates score range and exposes value helpers', () => {
    const score = TrainingScore.create(85);

    expect(score.getValue()).toBe(85);
    expect(score.isPassingScore(80)).toBe(true);
    expect(score.getGrade()).toBe('B');
    expect(score.getPercentage()).toBe('85%');
  });

  it('throws for scores outside 0..100', () => {
    expect(() => TrainingScore.create(-1)).toThrow('Score must be between 0 and 100');
    expect(() => TrainingScore.create(101)).toThrow('Score must be between 0 and 100');
  });
});
