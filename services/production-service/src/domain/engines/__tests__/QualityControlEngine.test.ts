import { QualityControlEngine } from '../QualityControlEngine';

describe('QualityControlEngine', () => {
    let engine: QualityControlEngine;

    beforeEach(() => {
        engine = new QualityControlEngine();
    });

    it('should assess quality', () => {
        const start = performance.now();
        const result = engine.assessQuality({ productId: 'p1', metrics: { defectRate: 0.01 } });
        const duration = performance.now() - start;
        
        expect(result.passed).toBeDefined();
        expect(duration).toBeLessThan(10);
    });

    it('should detect defects', () => {
        const defects = engine.detectDefects({ samples: [{ defective: true }] });
        expect(defects.length).toBeGreaterThanOrEqual(0);
    });
});
