import { StatisticalAlgorithm } from '../StatisticalAlgorithm';

describe('StatisticalAlgorithm', () => {
    let algorithm: StatisticalAlgorithm;

    beforeEach(() => {
        algorithm = new StatisticalAlgorithm();
    });

    it('should calculate statistics', () => {
        const start = performance.now();
        const result = algorithm.calculate([10, 20, 30, 40, 50]);
        const duration = performance.now() - start;
        
        expect(result.mean).toBe(30);
        expect(duration).toBeLessThan(10);
    });
});
