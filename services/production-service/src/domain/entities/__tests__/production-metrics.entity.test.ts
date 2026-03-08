import { ProductionMetrics } from '../ProductionMetrics.entity';

describe('ProductionMetrics Entity', () => {
    it('should create metrics', () => {
        const metrics = new ProductionMetrics({
            id: 'm-1',
            productionOrderId: 'o-1',
            createdAt: new Date()
        });
        expect(metrics.id).toBe('m-1');
    });

    it('should calculate efficiency', () => {
        const metrics = new ProductionMetrics({
            id: 'm-1',
            productionOrderId: 'o-1',
            cycleTimeSeconds: 100,
            createdAt: new Date()
        });

        // Target: 50s, Actual: 100s -> 50% efficiency
        metrics.calculateEfficiency(50);
        expect(metrics.efficiency).toBe(50);
    });

    it('should not calculate if cycle time missing', () => {
        const metrics = new ProductionMetrics({
            id: 'm-1',
            productionOrderId: 'o-1',
            createdAt: new Date()
        });
        metrics.calculateEfficiency(50);
        expect(metrics.efficiency).toBeUndefined();
    });
});
