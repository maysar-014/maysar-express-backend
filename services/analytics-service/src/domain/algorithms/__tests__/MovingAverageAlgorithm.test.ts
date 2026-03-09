import { MovingAverageAlgorithm } from '../MovingAverageAlgorithm';

describe('MovingAverageAlgorithm', () => {
    let algorithm: MovingAverageAlgorithm;

    beforeEach(() => {
        algorithm = new MovingAverageAlgorithm();
    });

    it('calculates simple moving average', () => {
        expect(algorithm.calculateSMA([10, 20, 30, 40, 50], 3)).toEqual([20, 30, 40]);
    });

    it('returns empty SMA when period is larger than values length', () => {
        expect(algorithm.calculateSMA([10, 20], 3)).toEqual([]);
    });

    it('calculates exponential moving average', () => {
        const result = algorithm.calculateEMA([10, 20, 30, 40, 50], 3);
        expect(result).toHaveLength(3);
        expect(result[0]).toBeCloseTo(20);
        expect(result[1]).toBeCloseTo(30);
        expect(result[2]).toBeCloseTo(40);
    });

    it('returns empty EMA when period is larger than values length', () => {
        expect(algorithm.calculateEMA([10], 3)).toEqual([]);
    });
});
