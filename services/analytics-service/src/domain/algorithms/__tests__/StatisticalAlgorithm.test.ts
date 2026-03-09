import { StatisticalAlgorithm } from '../StatisticalAlgorithm';

describe('StatisticalAlgorithm', () => {
    let algorithm: StatisticalAlgorithm;

    beforeEach(() => {
        algorithm = new StatisticalAlgorithm();
    });

    it('calculates mean and handles empty arrays', () => {
        expect(algorithm.mean([10, 20, 30, 40])).toBe(25);
        expect(algorithm.mean([])).toBe(0);
    });

    it('calculates median for odd/even arrays and handles empty arrays', () => {
        expect(algorithm.median([10, 20, 30])).toBe(20);
        expect(algorithm.median([10, 20, 30, 40])).toBe(25);
        expect(algorithm.median([])).toBe(0);
    });

    it('calculates standard deviation', () => {
        expect(algorithm.stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
        expect(algorithm.stdDev([])).toBe(0);
    });

    it('calculates z-score and handles zero stddev', () => {
        expect(algorithm.calculateZScore(12, 10, 2)).toBe(1);
        expect(algorithm.calculateZScore(12, 10, 0)).toBe(0);
    });
});
