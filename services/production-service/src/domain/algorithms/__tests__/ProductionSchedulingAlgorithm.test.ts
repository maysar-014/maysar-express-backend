import { ProductionSchedulingAlgorithm } from '../ProductionSchedulingAlgorithm';

describe('ProductionSchedulingAlgorithm', () => {
    let algorithm: ProductionSchedulingAlgorithm;

    beforeEach(() => {
        algorithm = new ProductionSchedulingAlgorithm();
    });

    it('should schedule production', () => {
        const start = performance.now();
        const schedule = algorithm.schedule([{ id: 'p1', duration: 60 }]);
        const duration = performance.now() - start;
        
        expect(schedule.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10);
    });
});
