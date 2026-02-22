import { CapacityManagementEngine } from '../CapacityManagementEngine';

describe('CapacityManagementEngine', () => {
    let engine: CapacityManagementEngine;

    beforeEach(() => {
        engine = new CapacityManagementEngine();
    });

    it('should calculate capacity', () => {
        const start = performance.now();
        const capacity = engine.calculateCapacity({ resources: [], timeframe: 'daily' });
        const duration = performance.now() - start;
        
        expect(capacity.available).toBeDefined();
        expect(duration).toBeLessThan(10);
    });
});
