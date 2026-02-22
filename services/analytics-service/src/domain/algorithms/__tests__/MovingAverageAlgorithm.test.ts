import { MovingAverageAlgorithm } from '../MovingAverageAlgorithm';

describe('MovingAverageAlgorithm', () => {
    let algorithm: MovingAverageAlgorithm;

    beforeEach(() => {
        algorithm = new MovingAverageAlgorithm();
    });

    it('should calculate moving average', () => {
        const start = performance.now();
        const result = algorithm.calculate([10, 20, 30, 40, 50], 3);
        const duration = performance.now() - start;
        
        expect(result.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10);
    });
});
