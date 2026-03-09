import { ScoringAlgorithm } from './scoring.algorithm';

describe('ScoringAlgorithm', () => {
  it('assigns grades across threshold boundaries', () => {
    const algorithm = new ScoringAlgorithm();

    expect(algorithm.calculateGrade(100)).toBe('A');
    expect(algorithm.calculateGrade(90)).toBe('A');
    expect(algorithm.calculateGrade(89)).toBe('B');
    expect(algorithm.calculateGrade(80)).toBe('B');
    expect(algorithm.calculateGrade(79)).toBe('C');
    expect(algorithm.calculateGrade(70)).toBe('C');
    expect(algorithm.calculateGrade(69)).toBe('D');
    expect(algorithm.calculateGrade(60)).toBe('D');
    expect(algorithm.calculateGrade(59)).toBe('F');
  });

  it('evaluates passing status by threshold', () => {
    const algorithm = new ScoringAlgorithm();

    expect(algorithm.isPassing(75, 70)).toBe(true);
    expect(algorithm.isPassing(70, 70)).toBe(true);
    expect(algorithm.isPassing(69, 70)).toBe(false);
  });
});
