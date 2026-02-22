import { LeadTimeCalculationAlgorithm } from '../LeadTimeCalculationAlgorithm';

describe('LeadTimeCalculationAlgorithm', () => {
    let algorithm: LeadTimeCalculationAlgorithm;

    beforeEach(() => {
        algorithm = new LeadTimeCalculationAlgorithm();
    });

    it('should calculate lead time', () => {
        const start = performance.now();
        const leadTime = algorithm.calculate({ steps: [{ duration: 30 }] });
        const duration = performance.now() - start;
        
        expect(leadTime).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10);
    });
});
