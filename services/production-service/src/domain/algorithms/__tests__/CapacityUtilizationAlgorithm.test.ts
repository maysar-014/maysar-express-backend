import { CapacityUtilizationAlgorithm } from '../CapacityUtilizationAlgorithm';

describe('CapacityUtilizationAlgorithm', () => {
    let algorithm: CapacityUtilizationAlgorithm;

    beforeEach(() => {
        algorithm = new CapacityUtilizationAlgorithm();
    });

    it('should calculate utilization', () => {
        const start = performance.now();
        const utilization = algorithm.calculate({ used: 80, total: 100 });
        const duration = performance.now() - start;
        
        expect(utilization).toBe(80);
        expect(duration).toBeLessThan(10);
    });
});
