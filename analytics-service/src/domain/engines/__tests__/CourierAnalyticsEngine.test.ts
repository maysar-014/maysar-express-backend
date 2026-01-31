import { CourierAnalyticsEngine } from '../CourierAnalyticsEngine';
import { CourierMetrics } from '../../types';

describe('CourierAnalyticsEngine', () => {
    let engine: CourierAnalyticsEngine;

    beforeEach(() => {
        engine = new CourierAnalyticsEngine();
    });

    describe('generatePerformanceReport', () => {
        it('should return high efficiency and excellent reliability for good metrics', () => {
            const metrics: CourierMetrics = {
                averageDeliveryTime: 20, // < 25
                deliveriesCompleted: 35, // > 30
                customerRating: 4.8,
                efficiency: 0.95
            };

            const report = engine.generatePerformanceReport(metrics);

            expect(report.efficiency).toBe('high');
            expect(report.reliability).toBe('excellent');
            expect(report.rating).toBe(4.8);
        });

        it('should return medium efficiency and good reliability for average metrics', () => {
            const metrics: CourierMetrics = {
                averageDeliveryTime: 30, // >= 25
                deliveriesCompleted: 20, // <= 30
                customerRating: 4.0,
                efficiency: 0.8
            };

            const report = engine.generatePerformanceReport(metrics);

            expect(report.efficiency).toBe('medium');
            expect(report.reliability).toBe('good');
            expect(report.rating).toBe(4.0);
        });

        it('should handle boundary values correctly', () => {
            const metrics: CourierMetrics = {
                averageDeliveryTime: 25, // Boundary condition
                deliveriesCompleted: 30, // Boundary condition
                customerRating: 4.5,
                efficiency: 0.9
            };

            const report = engine.generatePerformanceReport(metrics);

            // Based on code: metrics.averageDeliveryTime < 25 ? 'high' : 'medium'
            expect(report.efficiency).toBe('medium');

            // Based on code: metrics.deliveriesCompleted > 30 ? 'excellent' : 'good'
            expect(report.reliability).toBe('good');
        });
    });
});
