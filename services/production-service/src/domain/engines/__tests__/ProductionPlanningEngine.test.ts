import { ProductionPlanningEngine } from '../ProductionPlanningEngine';

describe('ProductionPlanningEngine', () => {
    let engine: ProductionPlanningEngine;

    beforeEach(() => {
        engine = new ProductionPlanningEngine();
    });

    it('should create production plan', () => {
        const start = performance.now();
        const plan = engine.createPlan({ orderId: 'o1', quantity: 100 });
        const duration = performance.now() - start;
        
        expect(plan.steps).toBeDefined();
        expect(duration).toBeLessThan(10);
    });

    it('should optimize schedule', () => {
        const schedule = engine.optimizeSchedule([{ id: 'p1', priority: 1 }]);
        expect(schedule.length).toBeGreaterThan(0);
    });
});
